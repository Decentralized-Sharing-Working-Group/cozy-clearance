clearance = require './index'
async = require 'async'
urlHelpers = require 'url'
request = require 'request'
htmlparser = require 'htmlparser2'
querystring = require 'querystring'
fs = require 'fs'
stream = require 'stream'

jugglingInAmericano = 'americano-cozy/node_modules/jugglingdb-cozy-adapter'


#TODO : change hard url by domain 
params = 
    me: null,
    redirect_uri: "http://localhost:9119" #/clearance/indieauth/callback",
    client_id: "http://localhost:9119",
    scope: 'post',
    response_type: 'code',
    state: null,
    code: null,
    token: null,


endpoints = 
    authorizationEndpoint: null
    micropubEndpoint: null
    tokenEndpoint: null

clearance = null

module.exports = (options) ->

    out = {}

    mailSubject = options.mailSubject
    mailTemplate = options.mailTemplate


    # support both cozydb & americano-cozy
    try
        cozydb = require 'cozydb'
        CozyAdapter = cozydb.api
        Contact = cozydb.getModel 'Contact',
            fn            : String
            n             : String
            _attachments  : Object
            datapoints    : [Object]



    catch err
        americano = require 'americano-cozy'
        CozyAdapter = try require 'americano-cozy/node_modules/' + \
                                  'jugglingdb-cozy-adapter'
        catch e then require 'jugglingdb-cozy-adapter'
        americano.getModel 'Contact',
            fn            : String
            n             : String
            _attachments  : (x) -> x
            datapoints    : (x) -> x




    # send a share mail
    sendMail = (doc, key, cb) ->
        rule = doc.clearance.filter((rule) -> rule.key is key)[0]

        doc.getPublicURL (err, url) =>
            return cb err if err

            urlObject = urlHelpers.parse url
            urlObject.query = key: rule.key
            url = urlObject.format()

            emailOptions = {doc, url, rule}
            async.parallel [
                (cb) -> mailSubject emailOptions, cb
                (cb) -> mailTemplate emailOptions, cb
            ], (err, results) ->
                [subject, htmlContent] = results
                emailInfo =
                    to: rule.email
                    subject: subject
                    content: url
                    html: htmlContent

                CozyAdapter.sendMailFromUser emailInfo, cb

    # change the whole clearance object
    out.change = (req, res, next) ->
        {clearance} = req.body
        req.doc.updateAttributes clearance: clearance, (err) ->
            return next err if err
            res.send req.doc

    # send multiple mails
    # expect body = [<rule>]
    out.sendAll = (req, res, next) ->
        toSend = req.body
        sent = []
        async.each toSend, (rule, cb) ->
            sent.push rule.key
            sendMail req.doc, rule.key, cb
        , (err) ->
            return next err if err
            newClearance = req.doc.clearance.map (rule) ->
                rule.sent = true if rule.key in sent
                return rule

            req.doc.updateAttributes clearance: newClearance, (err) ->
                    return next err if err
                    res.send req.doc

    out.getEmailsFromContactFields =  (contact) ->
        emails = contact.datapoints?.filter (dp) -> dp.name is 'email'
        emails = emails.map (dp) -> dp.value
        emails

    # take directly full name or build it from the name field.
    out.getContactFullName = (contact) ->
        contact.fn or contact.n?.split(';')[0..1].join(' ')

    out.simplifyContact = (contact) ->
        name = out.getContactFullName contact
        emails = out.getEmailsFromContactFields contact
        return simple =
            id: contact.id
            hasPicture: contact._attachments?.picture?
            name: name or '?'
            emails: emails or []

    # contact list for autocomplete
    out.contactList = (req, res, next) ->
        Contact.request 'all', (err, contacts) ->
            return next err if err
            res.send contacts.map out.simplifyContact

    out.contactPicture = (req, res, next) ->
        Contact.find req.params.contactid, (err, contact) ->
            return next err if err

            unless contact._attachments?.picture
                err = new Error('not found')
                err.status = 404
                return next err

            stream = contact.getFile 'picture', (err) ->
                return res.error 500, "File fetching failed.", err if err
            stream.pipe res

    out.contact = (req, res, next) ->
        Contact.find req.params.contactid, (err, contact) ->
            return next err if err

            unless contact
                err = new Error 'not found'
                err.status = 404
                return next err

            res.send out.simplifyContact contact



    # Endpoint discovery
    parser = new htmlparser.Parser
        onopentag: (name, attribs) -> 
            if name == "link" and attribs.rel == "authorization_endpoint"
                endpoints.authorizationEndpoint = attribs.href
            else if(name == "link" and attribs.rel == "micropub") 
                endpoints.micropubEndpoint = attribs.href
            else if(name == "link" and attribs.rel == "token_endpoint") 
                endpoints.tokenEndpoint = attribs.href
    , decodeEntities: true

    sendAuthRequest = (callback) ->
        request params.me, (err, res, body) ->
            if not err and res.statusCode == 200
                parser.write body
                parser.end()
                if endpoints.authorizationEndpoint
                    p = '?me=' + params.me + 
                                '&client_id='+ params.client_id + 
                                '&redirect_uri=' + params.redirect_uri +
                                '&response_type=' + params.response_type +  
                                '&state=' + params.state + 
                                '&scope=' + params.scope
                    callback null, endpoints.authorizationEndpoint + p
                else   
                    callback 'Discovery failed on the url'
            else   
                console.log err
                callback err

    out.indieAuth = (req, res, next) ->
        params.me = req.query.url
        params.state = req.query.id

        sendAuthRequest (err, redirectUrl) ->
            if err
                console.log 'error : ' + err
                next err
            else
                console.log 'redirection : ' + redirectUrl
                res.send JSON.stringify redirectUrl

    out.callback = (code) ->
        console.log 'code callback : ' + code
        params.code = code
        reqParams = 
            code: params.code
            redirect_uri: params.redirect_uri
            client_id: params.client_id,
            state: params.state

        postRequest endpoints.authorizationEndpoint, reqParams, null, (code, body) ->
            if code == 200
                getToken endpoints.tokenEndpoint, params, (err, token) -> 
                    if err?
                        console.log 'auth nok'
                    else
                        params.token = token;
                        console.log 'auth ok - token : ' + params.token
            else 
                console.log 'auth not ok'

    # Micropub sending
    out.micropub = (req, res, next, stream) ->

        reqParams = 
            h: 'entry'
            content: 'photo from cozy'
            photo: stream

        header = {Authorization: 'Bearer ' + params.token}
        postRequest endpoints.micropubEndpoint, reqParams, header,  (code, body) ->
            if code == 302
                console.log('Data sent')
                res.sendStatus 200
            
            else 
                console.log('code : ' + code + ' - body : ' + body)
                res.sendStatus 500
        
        next
        
    sendPhoto =  ( req, res, next) ->

        send = (endpoint, parameters) ->
            header = {Authorization: 'Bearer ' + params.token}
            postRequest endpoints.micropubEndpoint, parameters, header, (code, body) ->
                if code == 302
                    console.log('Data sent')
                    res.send 200
                    #res.render('sender', {status: (multipart ? 'Photo':'Note') + ' sent'});
                
                else 
                    console.log('code : ' + code + ' - body : ' + body)
                    res.send 500
                    #res.render('sender', {status: 'Sending failure'});

        reqParams = 
            h: 'entry'
            content: 'photo from cozy'
            photo: fs.createReadStream './test.jpg'

        header = {Authorization: 'Bearer ' + token}
        postRequest micropubEndpoint, reqParams, header,  (code, body) ->
            if code == 302
                console.log('Data sent')
                res.send 200
                #res.render('sender', {status: (multipart ? 'Photo':'Note') + ' sent'});
            
            else 
                console.log('code : ' + code + ' - body : ' + body)
                res.send 500


    #only for testing
    out.test = (req, res, token) ->
        token = 'eb158e31f8ed53695f6028b8b5b2da0d'
        micropubEndpoint = 'https://paultranvan.withknown.com/micropub/endpoint'
        reqParams = 
            h: 'entry'
            content: 'photo from cozy'
            photo: fs.createReadStream './test.jpg'

        header = {Authorization: 'Bearer ' + token}
        postRequest micropubEndpoint, reqParams, header,  (code, body) ->
            if code == 302
                console.log('Data sent')
                res.send 200
                #res.render('sender', {status: (multipart ? 'Photo':'Note') + ' sent'});
            
            else 
                console.log('code : ' + code + ' - body : ' + body)
                res.send 500

        
    # Get the authorization token from the endpoint 
    getToken = (endpoint, parameters, callback) ->
        request.post
            url: endpoint
            form: 
                me: params.me
                code: params.code
                redirect_uri: params.redirect_uri
                client_id: params.client_id
                state: params.state
                scope: params.scope
            , 
            (err, response, body) ->
                if err?
                    callback err
                else
                    parse = querystring.parse body
                    token = parse['access_token']
                    callback err, token


    postRequest = (endpoint, formValues, headers, callback) ->
        #postParams = new PostParameters endpoint, formValues, headers, multipart
        postParams = 
            url: endpoint
            formData: formValues
            headers: headers

       # console.log 'params : ' + console.log JSON.stringify postParams
        request.post postParams, (err, response, body) ->
            console.log 'response : ' + JSON.stringify response
            callback response.statusCode, body

    PostParameters = (url, formValues, headers) ->
        @url = url
        if multipart
            @formData = formValues
        else
            @form = formValues
        @headers = headers


    return out


