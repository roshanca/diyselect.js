(function() {
  (function(factory) {
    if (typeof define === 'function' && define.amd) {
      return define(['jquery'], factory);
    } else {
      return factory(window.jQuery);
    }
  })(function($) {

var App, Controller, DEFAULT_CALLBACKS, DiySelect, KEY_CODE, Model, View;

App = (function() {
  function App(selector) {
    this.$selector = $(selector);
    this.controller = new Controller(this);
    this.listen();
  }

  App.prototype.reg = function(setting) {
    this.controller.init(setting);
    this.dispatch();
    return this;
  };

  App.prototype.dispatch = function() {
    return this.controller.render_view(this.$selector.data('storage'));
  };

  App.prototype.listen = function() {
    return $(document).on('keydown.diySelect', (function(_this) {
      return function(e) {
        return _this.on_keydown(e);
      };
    })(this));
  };

  App.prototype.on_keydown = function(e) {
    var view;
    view = this.controller.view;
    switch (e.keyCode) {
      case KEY_CODE.ESC:
        e.preventDefault();
        view.hide();
        break;
      case KEY_CODE.DOWN:
        if (!view.visible()) {
          return;
        }
        e.preventDefault();
        view.next();
        break;
      case KEY_CODE.UP:
        if (!view.visible()) {
          return;
        }
        e.preventDefault();
        view.prev();
        break;
      case KEY_CODE.TAB:
      case KEY_CODE.ENTER:
        if (!view.visible()) {
          return;
        }
        e.preventDefault();
        view.choose();
        break;
      default:
        $.noop();
    }
  };

  return App;

})();

Controller = (function() {
  function Controller(app) {
    this.app = app;
    this.$selector = this.app.$selector;
    this.model = new Model(this);
    this.view = new View(this);
  }

  Controller.prototype.init = function(setting) {
    this.setting = $.extend({}, this.setting || $.fn.diySelect["default"], setting);
    this.$selector.hide();
    this.view.init();
    return this.model.load(this.query_data(this.setting.data));
  };

  Controller.prototype.destroy = function() {
    this.$selector.show();
    this.model.destroy();
    return this.view.destroy();
  };

  Controller.prototype.callbacks = function(func_name) {
    return this.get_opt("callbacks")[func_name] || DEFAULT_CALLBACKS[func_name];
  };

  Controller.prototype.get_opt = function(flag) {
    var e;
    try {
      return this.setting[flag];
    } catch (_error) {
      e = _error;
      return null;
    }
  };

  Controller.prototype.query_data = function(flag) {
    if (!flag) {
      return this.content();
    } else {
      return flag;
    }
  };

  Controller.prototype.content = function() {
    var $option, option, _i, _len, _results;
    $option = this.$selector.find('option');
    _results = [];
    for (_i = 0, _len = $option.length; _i < _len; _i++) {
      option = $option[_i];
      _results.push({
        text: option.text,
        value: option.value
      });
    }
    return _results;
  };

  Controller.prototype.render_view = function(data) {
    var text, width;
    text = this.get_opt('placeholder') || this.$selector.find('option:selected').text();
    width = this.get_opt('width');
    this.view.render_chosen(text, width);
    return this.view.render_list(data.slice(0, this.get_opt('limit')));
  };

  return Controller;

})();

Model = (function() {
  function Model(context) {
    this.context = context;
    this.storage = this.context.$selector;
  }

  Model.prototype.load = function(data) {
    if (typeof data === 'string') {
      return $.ajax(data, {
        dataType: 'json'
      }).done((function(_this) {
        return function(data) {
          return _this.save(data);
        };
      })(this));
    } else {
      return this.save(data);
    }
  };

  Model.prototype.save = function(data) {
    return this.storage.data('storage', this.context.callbacks('before_save').call(this.context, data || []));
  };

  Model.prototype.fetch = function() {
    return this.storage.data('storage');
  };

  Model.prototype.destroy = function() {
    return this.storage.data('storage', null);
  };

  return Model;

})();

View = (function() {
  function View(context) {
    this.context = context;
    this.$el = $('<div class="diyselect-view"><div class="diyselect-view-choice"><span class="diyselect-view-chosen"></span><span class="diyselect-view-arrow"></span><input type="hidden"></div><ul class="diyselect-view-list"></ul></div>');
    this.timeout_id = null;
    this.$el.insertAfter(this.context.$selector);
    this.$menu = this.$el.find('.diyselect-view-list');
    this.bind_event();
  }

  View.prototype.init = function() {
    var id;
    id = this.context.get_opt('alias') || this.context.$selector[0].id;
    return this.$el.attr({
      'id': "at-view-" + id
    });
  };

  View.prototype.destroy = function() {
    return this.$el.remove();
  };

  View.prototype.bind_event = function() {
    var $choice, $menu;
    $menu = this.$menu;
    $choice = this.$el.find('.diyselect-view-choice');
    $menu.on('mouseenter', 'li', function(e) {
      $menu.find('.cur').removeClass('cur');
      return $(e.currentTarget).addClass('cur');
    }).on('click', (function(_this) {
      return function(e) {
        e.preventDefault();
        return _this.choose();
      };
    })(this));
    $choice.on('click', (function(_this) {
      return function(e) {
        e.preventDefault();
        $menu.find('.cur').removeClass('cur');
        $menu.find('li').each(function() {
          var $this, current_text, target_text;
          $this = $(this);
          current_text = $this.text();
          target_text = $choice.text();
          if (current_text === target_text) {
            $this.addClass('cur');
            return false;
          }
        });
        return _this.show();
      };
    })(this));
    return $(document).on('click.diySelect', (function(_this) {
      return function(e) {
        if (!$choice.is(e.target) && $choice.has(e.target).length === 0) {
          return _this.hide();
        }
      };
    })(this));
  };

  View.prototype.choose = function() {
    var $chosen, $li, data;
    $li = this.$el.find('.cur');
    $chosen = this.$el.find('.diyselect-view-chosen');
    $chosen.text($li.text());
    data = $li.data('item-data');
    this.context.$selector[0].value = data.value;
    return this.hide();
  };

  View.prototype.next = function() {
    var cur, next;
    cur = this.$el.find('.cur').removeClass('cur');
    next = cur.next();
    if (!next.length) {
      next = this.$el.find('li:first');
    }
    return next.addClass('cur');
  };

  View.prototype.prev = function() {
    var cur, prev;
    cur = this.$el.find('.cur').removeClass('cur');
    prev = cur.prev();
    if (!prev.length) {
      prev = this.$el.find('li:last');
    }
    return prev.addClass('cur');
  };

  View.prototype.show = function() {
    if (!this.visible()) {
      return this.$menu.show();
    }
  };

  View.prototype.hide = function() {
    if (this.visible()) {
      return this.$menu.hide();
    }
  };

  View.prototype.visible = function() {
    return this.$menu.is(':visible');
  };

  View.prototype.render_chosen = function(text, width) {
    var $chosen;
    $chosen = this.$el.find('.diyselect-view-chosen');
    $chosen.text(text);
    return this.$el.width(width);
  };

  View.prototype.render_list = function(list) {
    var $li, $ul, height_li, height_ul, item, li, max_len, tpl, _i, _len;
    tpl = this.context.get_opt('tpl');
    $ul = this.$menu;
    $ul.empty();
    for (_i = 0, _len = list.length; _i < _len; _i++) {
      item = list[_i];
      li = this.context.callbacks('tpl_eval').call(this.context, tpl, item);
      $li = $(li);
      $li.data('item-data', item);
      $ul.append($li);
      height_li = $li.height();
    }
    max_len = this.context.get_opt('max_len');
    if (max_len) {
      height_ul = height_li * max_len;
      $ul.height(Math.min($ul.height(), height_ul));
    }
    return $ul.hide();
  };

  return View;

})();

KEY_CODE = {
  DOWN: 40,
  UP: 38,
  ESC: 27,
  TAB: 9,
  ENTER: 13
};

DEFAULT_CALLBACKS = {
  before_save: function(data) {
    if ($.isArray(data)) {
      return data;
    }
  },
  tpl_eval: function(tpl, map) {
    var e;
    try {
      return tpl.replace(/#\{([^\}]*)\}/g, function(tag, key, pos) {
        return map[key];
      });
    } catch (_error) {
      e = _error;
      return '';
    }
  }
};

DiySelect = {
  init: function(options) {
    var app;
    app = $(this).data('diyselect');
    if (!app) {
      app = new App(this);
      $(this).data('diyselect', app);
    }
    app.reg(options);
    return this;
  }
};

$.fn.diySelect = function() {
  var _args;
  _args = arguments;
  this.filter('select').each(function() {
    return DiySelect.init.apply(this, _args);
  });
  return this;
};

$.fn.diySelect["default"] = {
  width: 300,
  limit: void 0,
  tpl: '<li data-value="#{value}">#{text}</li>',
  callbacks: DEFAULT_CALLBACKS,
  max_len: 5
};

  });
}).call(this);
