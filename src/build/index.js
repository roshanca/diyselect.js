(function() {
  (function(factory) {
    if (typeof define === 'function' && define.amd) {
      return define(['jquery'], factory);
    } else {
      return factory(window.jQuery);
    }
  })(function($) {

var Api, App, Controller, DEFAULT_CALLBACKS, KEY_CODE, Model, View, diyselect;

App = (function() {
  function App(selector) {
    this.$selector = $(selector);
    this.controller = new Controller(this);
    this.listen();
  }

  App.prototype.run = function(setting) {
    this.controller.init(setting);
    this.controller.render_view(this.controller.model.fetch());
    return this;
  };

  App.prototype.listen = function() {
    return $(document).on('keydown.diyselect', (function(_this) {
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
        view.move_cur(1);
        break;
      case KEY_CODE.UP:
        if (!view.visible()) {
          return;
        }
        e.preventDefault();
        view.move_cur(-1);
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
    this.setting = $.extend({}, this.setting || $.fn.diyselect["default"], setting);
    this.$selector.hide();
    this.view.init();
    return this.model.load(this.query_data(this.setting.data));
  };

  Controller.prototype.destroy = function() {
    this.$selector.show();
    this.model.destroy();
    return this.view.destroy();
  };

  Controller.prototype.trigger = function(name, data) {
    var alias, event_name;
    if (data == null) {
      data = [];
    }
    data.push(this);
    alias = this.get_opt('alias');
    event_name = alias ? "" + name + "-" + alias + ".diyselect" : "" + name + ".diyselect";
    return this.$selector.trigger(event_name, data);
  };

  Controller.prototype.callbacks = function(func_name) {
    return this.get_opt('callbacks')[func_name] || DEFAULT_CALLBACKS[func_name];
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

  Controller.prototype.query_data = function(data) {
    if (!data) {
      return this.get_data(this.$selector);
    } else {
      return data;
    }
  };

  Controller.prototype.get_data = function($el) {
    var $optgroup, $option, index, optgroup, option, _data;
    $option = $el.find('option');
    $optgroup = $el.find('optgroup');
    return _data = {
      placeholder: this.get_opt('placeholder') || this.$selector.attr('placeholder'),
      optgroups: (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = $optgroup.length; _i < _len; _i++) {
          optgroup = $optgroup[_i];
          _results.push({
            label: optgroup.label
          });
        }
        return _results;
      })(),
      options: (function() {
        var _i, _len, _results;
        _results = [];
        for (index = _i = 0, _len = $option.length; _i < _len; index = ++_i) {
          option = $option[index];
          _results.push({
            order: index,
            optgroup: $(option).parent('optgroup').attr('label'),
            text: option.text,
            value: option.value
          });
        }
        return _results;
      })()
    };
  };

  Controller.prototype.render_view = function(data) {
    return this.view.render(data);
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
          _this.save(data);
          return _this.context.render_view(data);
        };
      })(this));
    } else {
      return this.save(data);
    }
  };

  Model.prototype.save = function(data) {
    return this.storage.data('storage', this.context.callbacks('before_save').call(this.context, data || []));
  };

  Model.prototype.saved = function() {
    return this.fetch() > 0;
  };

  Model.prototype.fetch = function() {
    return this.storage.data('storage') || [];
  };

  Model.prototype.destroy = function() {
    return this.storage.data('storage', null);
  };

  return Model;

})();

View = (function() {
  View.prototype.uid = function() {
    return (Math.random().toString(16) + "000000000").substr(2, 8) + (new Date().getTime());
  };

  function View(context) {
    this.context = context;
    this.$el = $('<div class="diyselect-view"> <div class="diyselect-choice"> <span class="chosen"></span> <span class="arrow"></span> <input type="hidden"> </div> <div class="diyselect-menu"></div> </div>');
    this.$el.insertAfter(this.context.$selector);
    this.$menu = this.$el.find('.diyselect-menu');
    this.bind_event();
  }

  View.prototype.init = function() {
    this.id = this.context.get_opt('alias') || this.context.$selector[0].id || this.uid();
    return this.$el.attr('id', "diyselect-" + this.id);
  };

  View.prototype.destroy = function() {
    this.$el.remove();
    $(document).off('.diyselect-' + this.id);
    return $(window).off('.diyselect-' + this.id);
  };

  View.prototype.bind_event = function() {
    var $choice, $menu;
    $menu = this.$menu;
    $choice = this.$el.find('.diyselect-choice');
    $menu.on('mouseenter', '.option', function(e) {
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
        if ($menu.children().length > 0) {
          _this.reset_cur();
          return _this.show();
        }
      };
    })(this));
    $(document).on('click.diyselect-' + this.id, (function(_this) {
      return function(e) {
        if (!$choice.is(e.target) && $choice.has(e.target).length === 0) {
          return _this.hide();
        }
      };
    })(this));
    return $(window).on('resize.diyselect-' + this.id, (function(_this) {
      return function() {
        return _this.reposition();
      };
    })(this));
  };

  View.prototype.choose = function() {
    var $chosen, $cur, cur_text, cur_value;
    if (($cur = this.$el.find('.cur')).length) {
      $chosen = this.$el.find('.chosen');
      cur_text = $cur.text();
      cur_value = $cur.data('value');
      $chosen.text(cur_text);
      $chosen.data('value', cur_value);
      this.context.$selector[0].value = cur_value;
      this.context.trigger('inserted', [cur_value, cur_text]);
      return this.hide();
    }
  };

  View.prototype.reposition = function() {
    var $el, $menu, top;
    $el = this.$el;
    $menu = this.$menu;
    if ($el.offset().top + $el.height() + $menu.height() - $(window).scrollTop() < $(window).height()) {
      top = $el.height();
      $el.removeClass('turnup');
    } else {
      top = -$menu.height();
      if (!$el.hasClass('turnup')) {
        $el.addClass('turnup');
      }
    }
    return $menu.css('top', top);
  };

  View.prototype.move_cur = function(step) {
    var $cur, $option, index;
    $option = this.$el.find('.option');
    $cur = this.$el.find('.cur');
    index = $option.index($cur) + step;
    $option.removeClass('cur');
    if (index < 0) {
      index = $option.length - 1;
    } else if (index >= $option.length) {
      index = 0;
    }
    $option.eq(index).addClass('cur');
    return this.scroll_to_cur();
  };

  View.prototype.reset_cur = function() {
    var $chosen, chosen_value;
    $chosen = this.$el.find('.chosen');
    chosen_value = $chosen.data('value');
    this.$menu.find('.cur').removeClass('cur');
    if (chosen_value) {
      return this.$menu.find('[data-value=' + chosen_value + ']').addClass('cur');
    }
  };

  View.prototype.scroll_to_cur = function() {
    var $cur, $menu, height_cur, height_menu, scroll, scroll_bottom, scroll_top, y;
    if (this.scrollable() && this.$menu.find('.cur').length > 0) {
      $menu = this.$menu;
      $cur = $menu.find('.cur');
      height_menu = $menu.height();
      height_cur = $cur.height();
      scroll = $menu.scrollTop() || 0;
      y = $cur.offset().top - $menu.offset().top + scroll;
      scroll_top = y;
      scroll_bottom = y - height_menu + height_cur;
      if (y + height_cur > height_menu + scroll) {
        return $menu.scrollTop(scroll_bottom);
      } else if (y < scroll) {
        return $menu.scrollTop(scroll_top);
      }
    }
  };

  View.prototype.show = function() {
    if (!this.visible()) {
      this.$menu.show();
    }
    this.context.trigger('shown');
    this.reposition();
    return this.scroll_to_cur();
  };

  View.prototype.hide = function() {
    if (this.visible()) {
      this.$menu.hide();
    }
    return this.context.trigger('hidden');
  };

  View.prototype.visible = function() {
    return this.$menu.is(':visible');
  };

  View.prototype.scrollable = function() {
    var max_len;
    max_len = this.context.get_opt('max_len');
    return max_len && max_len < this.$menu.find('.option').length;
  };

  View.prototype.render = function(data) {
    var $chosen, $optgroup, $option, group_tpl, index, item, optgroup, optgroups, option, option_tpl, options, placeholder, selected, _i, _j, _len, _len1;
    $chosen = this.$el.find('.chosen');
    placeholder = '<span class="placeholder">' + data.placeholder + '</span>';
    selected = this.context.$selector.find('option:selected').text();
    $chosen.html(data.placeholder ? placeholder : selected);
    if (!data.placeholder) {
      $chosen.data('value', this.context.$selector[0].value);
    }
    option_tpl = this.context.get_opt('option_tpl');
    optgroups = data.optgroups || [];
    options = data.options || [];
    if (optgroups.length > 0) {
      group_tpl = this.context.get_opt('group_tpl');
      for (_i = 0, _len = optgroups.length; _i < _len; _i++) {
        item = optgroups[_i];
        optgroup = this.context.callbacks('tpl_eval').call(this.context, group_tpl, item);
        $optgroup = $(optgroup);
        this.$menu.append($optgroup);
      }
    }
    for (index = _j = 0, _len1 = options.length; _j < _len1; index = ++_j) {
      item = options[index];
      option = this.context.callbacks('tpl_eval').call(this.context, option_tpl, item);
      $option = $(option);
      $option.data('item-data', $.extend(item, {
        order: index
      }));
      if (optgroups.length > 0) {
        this.$menu.find('[data-group="' + item.optgroup + '"]').append($option);
      } else {
        this.$menu.append($option);
      }
    }
    this.size(this.$menu);
    return this.$menu.hide();
  };

  View.prototype.size = function($menu) {
    $menu.css({
      height: '',
      width: ''
    });
    this.size_height($menu);
    return this.size_width($menu);
  };

  View.prototype.size_height = function($menu) {
    var $option, height, max_len;
    if (this.scrollable()) {
      max_len = this.context.get_opt('max_len');
      $option = $menu.find('.option');
      height = $option.height();
      return $menu.height(height * max_len);
    }
  };

  View.prototype.size_width = function($menu) {
    var $chosen, width, width_menu;
    width = this.context.get_opt('width');
    $chosen = this.$el.find('.chosen');
    if (width === 'auto') {
      this.$el.css('position', 'absolute');
      width_menu = Math.max($menu.width(), $chosen.outerWidth(true)) + this.$el.find('.arrow').width();
      this.$el.css('position', 'relative');
    } else {
      width_menu = parseFloat(width) || width();
      $menu.css('width', '100%');
    }
    $menu.outerWidth(width_menu);
    return this.$el.width(width_menu);
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
    return data;
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

Api = {
  reload: function(data) {
    return this.controller.render_view(data);
  },
  select: function(data) {
    var $li, view;
    view = this.controller.view;
    $li = view.$el.find('li');
    $li.removeClass('cur');
    return view.choose.call(view);
  },
  destroy: function() {
    this.controller.destroy();
    this.$selector.data('diyselect', null);
    return this.$selector.off('.diyselect');
  }
};

diyselect = {
  init: function(options) {
    var app;
    app = $(this).data('diyselect');
    if (!app) {
      app = new App(this);
      $(this).data('diyselect', app);
    }
    app.run(options);
    return this;
  }
};

$.fn.diyselect = function(method) {
  var result, _args;
  _args = arguments;
  result = null;
  this.filter('select').each(function() {
    var app;
    if (typeof method === 'object' || !method) {
      return diyselect.init.apply(this, _args);
    } else if (Api[method]) {
      if (app = $(this).data('diyselect')) {
        return result = Api[method].apply(app, Array.prototype.slice.call(_args, 1));
      }
    } else {
      return $.error("Method " + method + " does not exist on jQuery.diyselect");
    }
  });
  return result || this;
};

$.fn.diyselect["default"] = {
  width: 'auto',
  limit: 20,
  option_tpl: '<div class="option" data-value="#{value}">#{text}</div>',
  group_tpl: '<div class="optgroup" data-group="#{label}"><div class="optgroup-label">#{label}</div></div>',
  callbacks: DEFAULT_CALLBACKS,
  max_len: 5
};

  });
}).call(this);
