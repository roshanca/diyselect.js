/**
 * 用其它 HTMLElement 模拟 select
 * 属性：UI组件
 * 版本: 0.9.1
 * 依赖：jQuery ~> 1.7.2, pin ~> 0.8.2
 * 开发维护：wuwj
 */

var DiySelect = function (select, options) {
  options = $.extend({}, $.fn.diySelect.defaults, options);

  this.options = options;
  this.selectSpan = $('<span/>').addClass(options.selectClass);
  this.optionUl = $('<ul/>').addClass(options.optionClass);
  this.option = $(select).find('option');
  this.optionSize = this.option.length;
  this.arrowHtml = '<i class="' + this.options.arrowClass + '"></i>';
  this.bgIframe = $('<iframe/>').addClass('bgiframe').attr('frameborder', '0');
  this.isInit = false;

  this.init(select);
};

DiySelect.prototype = {

  constructor: DiySelect,

  init: function (select) {
    // 是否初始化且目标元素是否为 `select`
    if (this.isInit && select.tagName.toLowerCase !== 'select') {
      return;
    }

    var that = this;
    var active = -1;

    // 组装模拟元件
    this.setupOption();
    this.setupSelect();

    // DOM 操作：
    // 隐藏原 `select`，再其后加入模拟的 `HTMLElement`
    $(select).hide();
    this.selectSpan.insertAfter($(select));
    this.optionUl.insertAfter(this.selectSpan).hide();

    this.isInit = true;

    // 事件绑定
    this.selectSpan.on('click', function (e) { 
      e.preventDefault();
      e.stopPropagation();
      $('.' + that.options.optionClass).hide(); 

      if (that.optionUlVisible) {
        that.hideOption();
      } else {
        that.showOption();
      }
    });

    var list = this.optionUl.find('li');

    list.on('click', function (e) {
      var value = $(this).text();

      e.preventDefault();
      e.stopPropagation();
      that.chooseOption(value);
    });

    list.on('mouseenter', function () {
      list.removeClass('active');
      $(this).addClass('active');
      active = list.index(this);
    });

    $(select).on('choose', function (e, value) {
      e.stopPropagation();
      that.chooseOption(value);
    });

    // 窗口变化时调整位置
    $(window).on('resize', $.proxy(this.setPosition, this));

    // 模拟 `select` 失焦
    $(document).on('click', function () {
      if (that.optionUl.is(':visible')) { that.hideOption(); }
    });

    // 键盘事件
    $(document).on('keydown', function (e) {
      if (that.optionUl.is(':visible')) {
        switch (e.keyCode) {
          case 13: // enter
            that.hideOption();

            if (active !== -1) {
              var value = list.slice(active, active + 1).text();
              that.chooseOption(value);
            }
            break;
          case 27: // esc
            that.hideOption();
            break;
          case 38: // up
            e.preventDefault();
            moveSelect(-1);
            break;
          case 40: // down
            e.preventDefault();
            moveSelect(1);

            break;
        }
      }
    });

    /**
     * 焦点位移
     * @param  {float} step 位移步长
     */
    function moveSelect(step) {
      var count = that.optionSize;

      active += step;

      if (active < 0) {
        active =  0;
      } else if (active >= count) {
        active = count - 1;
      } else {
        list.removeClass('active');
        list.slice(active, active + 1).addClass('active');
      }
    }
  },

  setupSelect: function () {
    var text = this.options.checkText || this.option.filter(":selected").text();

    this.chooseOption(text);
  },

  setupOption: function () {
    var fragment = document.createDocumentFragment();

    for (var i = 0; i < this.optionSize; i++) {
      var li = document.createElement('li');
      var value = this.option[i].value;
      var text = this.option[i].text;

      li.innerHTML = text;

      if (value) { 
        li.setAttribute('data' + this.options.valueAttr, value); 
      }

      fragment.appendChild(li);
    }

    this.optionUl.get(0).appendChild(fragment);
  },

  setPosition: function () {
    // 可视窗口顶部到 `selectSpan` 的距离
    var top_height = this.selectSpan.offset().top + this.selectSpan.outerHeight() - $('body').scrollTop();

    // 可视窗口剩余空间与 `optionUl` 高度的差值
    var diff = $(window).height() - top_height - this.optionUl.height();

    // 差值大于零，说明剩余空间还可容纳 `optionUl`
    // `optionUl` 就位居 `selectSpan` 正下方展示
    // 反之亦然
    if ( diff > 0 ) {
      this.optionUl.pin({
        base: this.selectSpan,
        baseXY: [0, '100%-1px']
      });
    } else {
      this.optionUl.pin({
        base: this.selectSpan,
        selfXY: [0, '100%-1px']
      });
    }
  },

  showOption: function () {
    this.optionUl.show();

    this.optionUl.height(Math.min(this.optionUl.height(), 
      this.optionUl.find('li').height() * this.options.maxSize));

    this.optionUl.css({
      'min-width': this.selectSpan.outerWidth(),
      'z-index': this.options.zIndex
    });

    this.setPosition();
    this.optionUlVisible = true;
  },

  hideOption: function () {
    this.optionUl.hide();
    this.optionUlVisible = false;
  },

  chooseOption: function (value) {
    var list = this.optionUl.find('li');

    this.hideOption();
    this.selectSpan.html(value + this.arrowHtml);
    this.option.attr('selected', false);
    
    for (var i = 0; i < this.optionSize; i++) {
      if (value === this.option[i].text) {
        // 原生 `select` 中跟随选择
        this.option.eq(i).attr('selected', true);
        list.selectedIndex = i;
      }
    }
  
    // 已被选中的选项不在列表中展示
    list.show();
    list.eq(list.selectedIndex).hide();
  }
};

// 注册插件
$.fn.diySelect = function (options) {
  return this.each(function () {
    new DiySelect(this, options);
  });
};

$.fn.chooseSelect = function (value) {
  return this.trigger('choose', [value]);
};

// 默认设置
$.fn.diySelect.defaults = {
  selectClass: 'js-select',
  optionClass: 'js-option',
  arrowClass: 'arrow',
  valueAttr: 'select-val',
  zIndex: '99',
  offsetY: 1,
  maxSize: 6
};

$.fn.Constructor = DiySelect;