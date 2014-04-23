require.register("cozy-clearance/contact_autocomplete", function(exports, require, module){
    var Contact, contactCollection,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

contactCollection = new Backbone.Collection();

contactCollection.url = 'contacts';

contactCollection.model = Contact = (function(_super) {
  __extends(Contact, _super);

  function Contact() {
    return Contact.__super__.constructor.apply(this, arguments);
  }

  Contact.prototype.match = function(filter) {
    return filter.test(this.get('name')) || this.get('emails').some(function(email) {
      return filter.test(email);
    });
  };

  return Contact;

})(Backbone.Model);

contactCollection.fetch();

module.exports = function(input, onGuestAdded, extrafilter) {
  if (extrafilter == null) {
    extrafilter = function() {
      return true;
    };
  }
  input.on('keyup', (function(_this) {
    return function(event) {
      if (event.which === 13 && !input.data('typeahead').shown) {
        onGuestAdded(input.val());
        input.val('');
        return event.preventDefault();
      }
    };
  })(this));
  return input.typeahead({
    source: function(query) {
      var contacts, items, regexp;
      regexp = new RegExp(query);
      contacts = contactCollection.filter(function(contact) {
        return contact.match(regexp);
      });
      items = [];
      contacts.forEach(function(contact) {
        return contact.get('emails').forEach(function(email) {
          return items.push({
            id: contact.id,
            display: "" + (contact.get('name')) + " &lt;" + email + "&gt;",
            toString: function() {
              return "" + email + ";" + contact.id;
            }
          });
        });
      });
      items = items.filter(extrafilter);
      return items;
    },
    matcher: function(contact) {
      var old;
      old = $.fn.typeahead.Constructor.prototype.matcher;
      return old.call(this, contact.display);
    },
    sorter: function(contacts) {
      var beginswith, caseInsensitive, caseSensitive, contact, item;
      beginswith = [];
      caseSensitive = [];
      caseInsensitive = [];
      while ((contact = contacts.shift())) {
        item = contact.display;
        if (!item.toLowerCase().indexOf(this.query.toLowerCase())) {
          beginswith.push(contact);
        } else if (~item.indexOf(this.query)) {
          caseSensitive.push(contact);
        } else {
          caseInsensitive.push(contact);
        }
      }
      return beginswith.concat(caseSensitive, caseInsensitive);
    },
    highlighter: function(contact) {
      var old;
      old = $.fn.typeahead.Constructor.prototype.highlighter;
      return old.call(this, contact.display);
    },
    updater: (function(_this) {
      return function(value) {
        onGuestAdded(value);
        return "";
      };
    })(this)
  });
};

});
require.register("cozy-clearance/modal", function(exports, require, module){
    var Modal,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Modal = (function(_super) {
  __extends(Modal, _super);

  function Modal() {
    return Modal.__super__.constructor.apply(this, arguments);
  }

  Modal.prototype.id = 'modal-dialog';

  Modal.prototype.className = 'modal fade';

  Modal.prototype.initialize = function(options) {
    if (this.title == null) {
      this.title = options.title;
    }
    if (this.content == null) {
      this.content = options.content;
    }
    if (this.yes == null) {
      this.yes = options.yes || 'ok';
    }
    if (this.no == null) {
      this.no = options.no || 'cancel';
    }
    if (this.cb == null) {
      this.cb = options.cb || function() {};
    }
    this.render();
    this.saving = false;
    this.$el.modal('show');
    return this.$el.one('hide.bs.modal', (function(_this) {
      return function() {
        setTimeout((function() {
          return _this.remove();
        }), 1000);
        return _this.cb(_this.saving);
      };
    })(this));
  };

  Modal.prototype.events = function() {
    return {
      "click #modal-dialog-no": (function(_this) {
        return function() {
          return _this.$el.modal('hide');
        };
      })(this),
      "click #modal-dialog-yes": (function(_this) {
        return function() {
          _this.saving = true;
          return _this.$el.modal('hide');
        };
      })(this)
    };
  };

  Modal.prototype.render = function() {
    var body, close, container, foot, head, title, yesBtn;
    close = $('<button class="close" type="button" data-dismiss="modal" aria-hidden="true">×</button>');
    title = $('<h4 class="model-title">').text(this.title);
    head = $('<div class="modal-header">').append(close, title);
    body = $('<div class="modal-body">').append(this.renderContent());
    yesBtn = $('<button id="modal-dialog-yes" class="btn btn-cozy">').text(this.yes);
    foot = $('<div class="modal-footer">').append(yesBtn);
    if (this.no) {
      foot.prepend($('<button id="modal-dialog-no" class="btn btn-link">').text(this.no));
    }
    container = $('<div class="modal-content">').append(head, body, foot);
    container = $('<div class="modal-dialog">').append(container);
    return $("body").append(this.$el.append(container));
  };

  Modal.prototype.renderContent = function() {
    return this.content;
  };

  return Modal;

})(Backbone.View);

Modal.alert = function(title, content, cb) {
  return new Modal({
    title: title,
    content: content,
    yes: 'ok',
    no: null,
    cb: cb
  });
};

Modal.confirm = function(title, content, yesMsg, noMsg, cb) {
  return new Modal({
    title: title,
    content: content,
    yes: yesMsg,
    no: noMsg,
    cb: cb
  });
};

Modal.error = function(text, cb) {
  return new ModalView(t("modal error"), text, t("modal ok"), false, cb);
};

module.exports = Modal;

});
require.register("cozy-clearance/modal_share_template", function(exports, require, module){
    function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),t = locals_.t,type = locals_.type,model = locals_.model,clearance = locals_.clearance,makeURL = locals_.makeURL,possible_permissions = locals_.possible_permissions;
buf.push("<p>" + (jade.escape(null == (jade.interp = t('modal question ' + type + ' shareable', {name: model.get('name')})) ? "" : jade.interp)) + "</p><p><button id=\"share-public\" class=\"button btn-cozy\">" + (jade.escape(null == (jade.interp = t('public')) ? "" : jade.interp)) + "</button>&nbsp;<button id=\"share-private\" class=\"button btn-cozy\">" + (jade.escape(null == (jade.interp = t('private')) ? "" : jade.interp)) + "</button></p>");
if ( clearance == 'public')
{
buf.push("<p>" + (jade.escape(null == (jade.interp = t('modal shared ' + type + ' link msg')) ? "" : jade.interp)) + "</p><input" + (jade.attr("value", makeURL(), true, false)) + " class=\"form-control\"/>");
}
else
{
buf.push("<p>" + (jade.escape(null == (jade.interp = t('only you can see')) ? "" : jade.interp)) + "</p><input id=\"share-input\" type=\"text\"" + (jade.attr("placeholder", t('modal shared ' + type + ' custom msg'), true, false)) + " class=\"form-control\"/><ul id=\"share-list\">");
// iterate clearance
;(function(){
  var $$obj = clearance;
  if ('number' == typeof $$obj.length) {

    for (var i = 0, $$l = $$obj.length; i < $$l; i++) {
      var rule = $$obj[i];

var key = rule.key
buf.push("<li><a" + (jade.attr("data-key", key, true, false)) + (jade.attr("title", t("see link"), true, false)) + (jade.attr("href", makeURL(key), true, false)) + " class=\"show-link\"><i class=\"glyphicon glyphicon-link\"></i></a> &nbsp; &nbsp;" + (jade.escape(null == (jade.interp = rule.email) ? "" : jade.interp)));
var keys = Object.keys(possible_permissions)
if ( keys.length > 1)
{
buf.push("<select" + (jade.attr("data-key", key, true, false)) + " class=\"changeperm\">");
// iterate possible_permissions
;(function(){
  var $$obj = possible_permissions;
  if ('number' == typeof $$obj.length) {

    for (var perm = 0, $$l = $$obj.length; perm < $$l; perm++) {
      var display = $$obj[perm];

buf.push("<option" + (jade.attr("value", perm, true, false)) + (jade.attr("selected", rule.perm==perm, true, false)) + ">" + (jade.escape(null == (jade.interp = ' ' + t('perm') + t(display)) ? "" : jade.interp)) + "</option>");
    }

  } else {
    var $$l = 0;
    for (var perm in $$obj) {
      $$l++;      var display = $$obj[perm];

buf.push("<option" + (jade.attr("value", perm, true, false)) + (jade.attr("selected", rule.perm==perm, true, false)) + ">" + (jade.escape(null == (jade.interp = ' ' + t('perm') + t(display)) ? "" : jade.interp)) + "</option>");
    }

  }
}).call(this);

buf.push("</select>");
}
else
{
buf.push(jade.escape(null == (jade.interp = ' ' + t('perm') + possible_permissions[keys[0]]) ? "" : jade.interp));
}
buf.push("<a" + (jade.attr("data-key", key, true, false)) + (jade.attr("title", t("revoke"), true, false)) + " class=\"pull-right revoke\"><i class=\"icon-remove\"></i></a></li>");
    }

  } else {
    var $$l = 0;
    for (var i in $$obj) {
      $$l++;      var rule = $$obj[i];

var key = rule.key
buf.push("<li><a" + (jade.attr("data-key", key, true, false)) + (jade.attr("title", t("see link"), true, false)) + (jade.attr("href", makeURL(key), true, false)) + " class=\"show-link\"><i class=\"glyphicon glyphicon-link\"></i></a> &nbsp; &nbsp;" + (jade.escape(null == (jade.interp = rule.email) ? "" : jade.interp)));
var keys = Object.keys(possible_permissions)
if ( keys.length > 1)
{
buf.push("<select" + (jade.attr("data-key", key, true, false)) + " class=\"changeperm\">");
// iterate possible_permissions
;(function(){
  var $$obj = possible_permissions;
  if ('number' == typeof $$obj.length) {

    for (var perm = 0, $$l = $$obj.length; perm < $$l; perm++) {
      var display = $$obj[perm];

buf.push("<option" + (jade.attr("value", perm, true, false)) + (jade.attr("selected", rule.perm==perm, true, false)) + ">" + (jade.escape(null == (jade.interp = ' ' + t('perm') + t(display)) ? "" : jade.interp)) + "</option>");
    }

  } else {
    var $$l = 0;
    for (var perm in $$obj) {
      $$l++;      var display = $$obj[perm];

buf.push("<option" + (jade.attr("value", perm, true, false)) + (jade.attr("selected", rule.perm==perm, true, false)) + ">" + (jade.escape(null == (jade.interp = ' ' + t('perm') + t(display)) ? "" : jade.interp)) + "</option>");
    }

  }
}).call(this);

buf.push("</select>");
}
else
{
buf.push(jade.escape(null == (jade.interp = ' ' + t('perm') + possible_permissions[keys[0]]) ? "" : jade.interp));
}
buf.push("<a" + (jade.attr("data-key", key, true, false)) + (jade.attr("title", t("revoke"), true, false)) + " class=\"pull-right revoke\"><i class=\"icon-remove\"></i></a></li>");
    }

  }
}).call(this);

buf.push("</ul>");
};return buf.join("");
}
module.exports = template;
});
require.register("cozy-clearance/modal_share_view", function(exports, require, module){
    var CozyClearanceModal, Modal, clearanceDiff, contactTypeahead, randomString,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Modal = require("./modal");

contactTypeahead = require("./contact_autocomplete");

randomString = function(length) {
  var string;
  if (length == null) {
    length = 32;
  }
  string = "";
  while (string.length < length) {
    string += Math.random().toString(36).substr(2);
  }
  return string.substr(0, length);
};

clearanceDiff = function(now, old) {
  if (now === 'public') {
    return [];
  }
  if (old === 'public') {
    return now;
  }
  return now.filter(function(rule) {
    return !_.findWhere(old, {
      key: rule.key
    });
  });
};

module.exports = CozyClearanceModal = (function(_super) {
  __extends(CozyClearanceModal, _super);

  function CozyClearanceModal() {
    this.showLink = __bind(this.showLink, this);
    this.onClose = __bind(this.onClose, this);
    this.revoke = __bind(this.revoke, this);
    this.onGuestAdded = __bind(this.onGuestAdded, this);
    this.getRenderData = __bind(this.getRenderData, this);
    this.typeaheadFilter = __bind(this.typeaheadFilter, this);
    this.makeURL = __bind(this.makeURL, this);
    return CozyClearanceModal.__super__.constructor.apply(this, arguments);
  }

  CozyClearanceModal.prototype.template_content = require('./modal_share_template');

  CozyClearanceModal.prototype.events = function() {
    return _.extend(CozyClearanceModal.__super__.events.apply(this, arguments), {
      "click #share-public": "makePublic",
      "click #share-private": "makePrivate",
      'click #modal-dialog-share-save': 'onSave',
      'click .revoke': 'revoke',
      'click .show-link': 'showLink',
      'change select.changeperm': 'changePerm'
    });
  };

  CozyClearanceModal.prototype.permissions = function() {
    return {
      'r': t('r')
    };
  };

  CozyClearanceModal.prototype.initialize = function(options) {
    this.cb = this.onClose;
    this.model = options.model;
    this.model.set('clearance', this.model.get('clearance') || []);
    this.initState = JSON.parse(JSON.stringify(this.model.get('clearance')));
    this.title = t('sharing');
    this.yes = t('save');
    this.no = t('cancel');
    return CozyClearanceModal.__super__.initialize.apply(this, arguments);
  };

  CozyClearanceModal.prototype.makeURL = function(key) {
    var url;
    url = this.model.getPublicURL();
    if (key) {
      url += '?key=' + key;
    }
    return url;
  };

  CozyClearanceModal.prototype.makePublic = function() {
    if (this.forcedPublic || this.model.get('clearance') === 'public') {
      return;
    }
    this.lastPrivate = this.model.get('clearance');
    this.model.set({
      clearance: 'public'
    });
    return this.refresh();
  };

  CozyClearanceModal.prototype.makePrivate = function() {
    if (Array.isArray(this.model.get('clearance'))) {
      return;
    }
    this.model.set({
      clearance: this.lastPrivate || []
    });
    return this.refresh();
  };

  CozyClearanceModal.prototype.afterRender = function() {
    var clearance;
    clearance = this.model.get('clearance') || [];
    if (this.forcedPublic || clearance === 'public') {
      return this.$('#share-public').addClass('toggled');
    } else {
      this.$('#share-private').addClass('toggled');
      return contactTypeahead(this.$('#share-input'), this.onGuestAdded, this.typeaheadFilter);
    }
  };

  CozyClearanceModal.prototype.renderContent = function() {
    return $('<p>Please wait</p>');
  };

  CozyClearanceModal.prototype.typeaheadFilter = function(item) {
    return !this.existsEmail(item.toString().split(';')[0]);
  };

  CozyClearanceModal.prototype.existsEmail = function(email) {
    return this.model.get('clearance').some(function(rule) {
      return rule.email === email;
    });
  };

  CozyClearanceModal.prototype.getRenderData = function() {
    return {
      type: this.model.get('type'),
      model: this.model,
      clearance: this.model.get('clearance'),
      makeURL: this.makeURL,
      possible_permissions: this.permissions(),
      t: t
    };
  };

  CozyClearanceModal.prototype.refresh = function(data) {
    if (data) {
      this.model.set(data);
    }
    this.$('.modal-body').html(this.template_content(this.getRenderData()));
    return this.afterRender();
  };

  CozyClearanceModal.prototype.onGuestAdded = function(result) {
    var contactid, email, key, perm, _ref;
    _ref = result.split(';'), email = _ref[0], contactid = _ref[1];
    if (this.existsEmail(email)) {
      return null;
    }
    key = randomString();
    perm = 'r';
    this.model.get('clearance').push({
      email: email,
      contactid: contactid,
      key: key,
      perm: perm
    });
    return this.refresh();
  };

  CozyClearanceModal.prototype.revoke = function(event) {
    var clearance;
    clearance = this.model.get('clearance').filter(function(rule) {
      return rule.key !== event.currentTarget.dataset.key;
    });
    this.model.set({
      clearance: clearance
    });
    return this.refresh();
  };

  CozyClearanceModal.prototype.changePerm = function(event) {
    var select;
    select = event.currentTarget;
    return this.model.get('clearance').filter(function(rule) {
      return rule.key === select.dataset.key;
    })[0].perm = select.options[select.selectedIndex].value;
  };

  CozyClearanceModal.prototype.onClose = function(saving) {
    var newClearances, text;
    if (!saving) {
      return this.model.set({
        clearance: this.initState
      });
    } else {
      newClearances = clearanceDiff(this.model.get('clearance'), this.initState);
      if (newClearances.length) {
        text = t("send mails question") + newClearances.map(function(rule) {
          return rule.email;
        }).join(', ');
        return Modal.confirm(t("modal send mails"), text, t("yes"), t("no"), (function(_this) {
          return function(sendmail) {
            return _this.doSave(sendmail, newClearances);
          };
        })(this));
      } else {
        return this.doSave(false);
      }
    }
  };

  CozyClearanceModal.prototype.showLink = function(event) {
    var label, line, link, url, urlField;
    link = $(event.currentTarget);
    url = link.prop('href');
    line = $('<div class="linkshow">');
    label = $('<label>').text(t('copy paste link'));
    urlField = $('<input type="text">').val(url).blur(function(e) {
      return line.remove();
    });
    link.parents('li').append(line.append(label, urlField));
    urlField.focus().select();
    event.preventDefault();
    return false;
  };

  return CozyClearanceModal;

})(Modal);

});