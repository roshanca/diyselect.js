class App
  # @param selector [HTML DOM Object] `select`
  constructor: (selector) ->
    @$selector  = $(selector)
    @controller = new Controller(this)
    this.listen()

  run: (setting) ->
    @controller.init setting
    @controller.render_view @controller.model.fetch()
    this

  listen: ->
    $(document).on 'keydown.diyselect', (e) =>
      this.on_keydown(e)

  on_keydown: (e) ->
    view = @controller.view

    switch e.keyCode
      when KEY_CODE.ESC
        e.preventDefault()
        view.hide()
      when KEY_CODE.DOWN
        return unless view.visible()
        e.preventDefault()
        # view.next()
        view.move_cur(1)
      when KEY_CODE.UP
        return unless view.visible()
        e.preventDefault()
        # view.prev()
        view.move_cur(-1)
      when KEY_CODE.TAB, KEY_CODE.ENTER
        return unless view.visible()
        e.preventDefault()
        view.choose()
      else
        $.noop()
    return

# Class to controll model and view
class Controller
  constructor: (@app) ->
    @$selector = @app.$selector
    @model     = new Model(this)
    @view      = new View(this)

  init: (setting) ->
    @setting = $.extend {}, @setting || $.fn.diyselect.default, setting
    @$selector.hide()
    @view.init()
    @model.load this.query_data @setting.data

  destroy: ->
    @$selector.show()
    @model.destroy()
    @view.destroy()

  # Delegate custom `jQueryEvent` to the inputor
  # This function will add `diyselect` as namespace to every jQuery event
  # and pass current context as the last param to it.
  #
  # @example
  #   this.trigger "roll_n_rock", [1,2,3,4]
  #
  #   $selector.on "roll_n_rock", (e, one, two, three, four) ->
  #     console.log one, two, three, four
  #
  # @param name [String] event name
  # @param data [Array]  data to callback
  trigger: (name, data = []) ->
    data.push this
    alias = this.get_opt 'alias'
    event_name = if alias then "#{name}-#{alias}.diyselect" else "#{name}.diyselect"
    @$selector.trigger event_name, data

  # Get callback either in custom settings or in default callbacks list
  #
  # @param func_name [String] callback's name
  # @return [Function] callback
  callbacks: (func_name) ->
    this.get_opt('callbacks')[func_name] || DEFAULT_CALLBACKS[func_name]

  # @param flag [String] setting's name
  # @return [?] setting's value
  get_opt: (flag) ->
    try
      @setting[flag]
    catch e
      null

  query_data: (data) ->
    if not data
      this.get_data(@$selector)
    else
      data

  # Get data from original `select`
  #
  # @param $el [jQuery Object] `select`
  # @return _data [Object] the formatted data
  # @example Object {placeholder: "String", optgroups: Array[2], options: Array[4]}
  #          optgroups: [{label: "label1"}, {label: "label2"}]
  #          options: [{order: 0, text: "aaa", value: "1", optgroup: "label1"}, ...]
  get_data: ($el) ->
    $option = $el.find 'option'
    $optgroup = $el.find 'optgroup'

    _data =
      placeholder: this.get_opt('placeholder') or @$selector.attr('placeholder')
      optgroups: label: optgroup.label for optgroup in $optgroup
      options: for option, index in $option
                order: index
                optgroup: $(option).parent('optgroup').attr('label')
                text: option.text
                value: option.value

  # @param data [Object] data from original `select` or user's settings
  render_view: (data) ->
    @view.render data

# Class to process data
class Model
  constructor: (@context) ->
    @storage = @context.$selector

  # load data from local or remote with callback
  #
  # @param data [Object|String] data to load
  load: (data) ->
    if typeof data is 'string'
      $.ajax(data, dataType: 'json').done (data) =>
        this.save(data)
        @context.render_view data
    else
      this.save(data)

  save: (data) ->
    @storage.data 'storage', @context.callbacks('before_save').call(@context, data || [])

  saved: ->
    this.fetch() > 0

  fetch: ->
    @storage.data('storage') or []

  # index_of: (data) ->
  #   if data
  #     if data.value
  #       search_key = 'value'
  #     else if data.text
  #       search_key = 'text'
  #     else if data.index
  #       search_key = 'index'
  #     else
  #       return
  #     storages = this.fetch()[0...@context.get_opt('limit')]
  #     result = index for storage, index in storages when storage[search_key] is data[search_key]
  #     result or 0

  destroy: ->
    @storage.data 'storage', null

# View class to control how app's view showing
# All classes share the same DOM view
class View
  uid: ->
    (Math.random().toString(16)+"000000000").substr(2,8) + (new Date().getTime())

  constructor: (@context) ->
    @$el = $('<div class="diyselect-view">
                <div class="diyselect-choice">
                  <span class="chosen"></span>
                  <span class="arrow"></span>
                  <input type="hidden">
                </div>
                <div class="diyselect-menu"></div>
              </div>')
    # Insert to DOM
    @$el.insertAfter @context.$selector
    @$menu = @$el.find '.diyselect-menu'
    this.bind_event()

  init: ->
    @id = @context.get_opt('alias') or @context.$selector[0].id or this.uid()
    @$el.attr 'id', "diyselect-#{@id}"

  destroy: ->
    @$el.remove()
    $(document).off '.diyselect-' + @id
    $(window).off '.diyselect-' + @id

  bind_event: ->
    $menu   = @$menu
    $choice = @$el.find '.diyselect-choice'

    $menu.on 'mouseenter', '.option', (e) ->
      $menu.find('.cur').removeClass 'cur'
      $(e.currentTarget).addClass 'cur'
    .on 'click', (e) =>
      e.preventDefault()
      this.choose()

    $choice.on 'click', (e) =>
      e.preventDefault()
      if $menu.children().length > 0
        this.reset_cur()
        this.show()

    # Simulate blur event of view as form elements
    $(document).on 'click.diyselect-' + @id, (e) =>
      this.hide() if not $choice.is(e.target) and $choice.has(e.target).length is 0

    # Reposition dropdown menu
    $(window).on 'resize.diyselect-' + @id, =>
      this.reposition()

  choose: ->
    if ($cur = @$el.find '.cur').length
      $chosen   = @$el.find '.chosen'
      cur_text  = $cur.text()
      cur_value = $cur.data 'value'
      $chosen.text cur_text
      $chosen.data 'value', cur_value
      # Sync selected status between app's view and origin select
      @context.$selector[0].value = cur_value
      @context.trigger 'inserted', [cur_value, cur_text]
      this.hide()

  reposition: ->
    $el = @$el
    $menu = @$menu

    if $el.offset().top + $el.height() + $menu.height() - $(window).scrollTop() < $(window).height()
      top = $el.height()
      $el.removeClass 'turnup'
    else
      top = -$menu.height()
      $el.addClass 'turnup' unless $el.hasClass 'turnup'

    $menu.css('top', top)

  # next: ->
  #   cur  = @$el.find('.cur').removeClass 'cur'
  #   next = cur.next('.option')
  #   next = @$el.find('.option:first') unless next.length
  #   next.addClass 'cur'
  #   this.scroll_to_cur(next)

  # prev: ->
  #   cur  = @$el.find('.cur').removeClass 'cur'
  #   prev = cur.prev('.option')
  #   prev = @$el.find('.option:last') unless prev.length
  #   prev.addClass 'cur'
  #   this.scroll_to_cur(prev)

  move_cur: (step) ->
    $option = @$el.find('.option')
    $cur    = @$el.find('.cur')
    index   = $option.index($cur) + step
    $option.removeClass 'cur'

    if index < 0
      index = $option.length - 1
    else if index >= $option.length
      index = 0

    $option.eq(index).addClass('cur')
    this.scroll_to_cur()
    # this.scroll_menu_to($cur)
    # if index >= 0 && index < $option.length then $option.eq(index).addClass('cur') else $option.eq($option.length - 1).addClass('cur')

  reset_cur: ->
    $chosen = @$el.find '.chosen'
    chosen_value = $chosen.data 'value'
    @$menu.find('.cur').removeClass('cur')
    @$menu.find('[data-value=' + chosen_value + ']').addClass 'cur' if chosen_value

  # Make dropdown menu's item scroll to the right position automatically
  #
  # @param cur [Object] current item of menu
  # scroll_menu_to: ($cur) ->
  #   max_len  = @context.get_opt('max_len')
  #   $option  = @$menu.find '.option'
  #   height   = $option.height()
  #   interval = $option.index($cur) + 1 - max_len
  #   @$menu.scrollTop if interval > 0 then height * interval else 0

  scroll_to_cur: ->
    if this.scrollable() and @$menu.find('.cur').length > 0
      $menu         = @$menu
      $cur          = $menu.find('.cur')
      height_menu   = $menu.height()
      height_cur    = $cur.height()
      scroll        = $menu.scrollTop() || 0
      y             = $cur.offset().top - $menu.offset().top + scroll
      scroll_top    = y
      scroll_bottom = y - height_menu + height_cur

      if y + height_cur > height_menu + scroll
        $menu.scrollTop(scroll_bottom)
      else if y < scroll
        $menu.scrollTop(scroll_top)

  show: ->
    @$menu.show() unless this.visible()
    @context.trigger 'shown'
    this.reposition()
    # this.scroll_to_cur(@$menu.find('.cur'))
    this.scroll_to_cur()

  hide: ->
    @$menu.hide() if this.visible()
    @context.trigger 'hidden'

  # Check if dropdown menu is visible
  #
  # @return [Boolean]
  visible: ->
    @$menu.is ':visible'

  # Check if dropdown menu is scrollable
  #
  # @return [Boolean]
  scrollable: ->
    max_len = @context.get_opt('max_len')
    max_len and max_len < @$menu.find('.option').length

  render: (data) ->
    $chosen     = @$el.find '.chosen'
    placeholder = '<span class="placeholder">' + data.placeholder + '</span>'
    selected    = @context.$selector.find('option:selected').text()
    $chosen.html if data.placeholder then placeholder else selected
    $chosen.data('value', @context.$selector[0].value) if not data.placeholder

    option_tpl = @context.get_opt 'option_tpl'
    optgroups  = data.optgroups or []
    options    = data.options or []

    if optgroups.length > 0
      group_tpl = @context.get_opt 'group_tpl'
      for item in optgroups
        optgroup = @context.callbacks('tpl_eval').call(@context, group_tpl, item)
        $optgroup = $(optgroup)
        @$menu.append $optgroup

    for item, index in options
      option = @context.callbacks('tpl_eval').call(@context, option_tpl, item)
      $option = $(option)
      $option.data 'item-data', $.extend item, { order: index }
      if optgroups.length > 0
        @$menu.find('[data-group="' + item.optgroup + '"]').append $option
      else
        @$menu.append $option

    this.size @$menu
    @$menu.hide()

  size: ($menu) ->
    $menu.css
      height: ''
      width: ''
    this.size_height $menu
    this.size_width  $menu

  size_height: ($menu) ->
    # Make dropdown menu scrollable if it's size hit the limit of max_len
    if this.scrollable()
      max_len = @context.get_opt 'max_len'
      $option = $menu.find('.option')
      height  = $option.height()
      $menu.height height * max_len

  size_width: ($menu) ->
    width = @context.get_opt 'width'
    $chosen = @$el.find '.chosen'

    # There's two ways to width it: auto or fixed
    # auto: dropdown menu will display as the longest item's
    # fixed: dropdown menu will display in fixed width, if it's item
    # was longer than the width, replace it with the ellipsis
    if width is 'auto'
      @$el.css 'position', 'absolute'
      width_menu = Math.max($menu.width(), $chosen.outerWidth(true)) + @$el.find('.arrow').width()
      @$el.css 'position', 'relative'
    else
      width_menu = parseFloat(width) or width()
      $menu.css 'width', '100%'
    $menu.outerWidth width_menu
    @$el.width width_menu

KEY_CODE =
  DOWN: 40
  UP: 38
  ESC: 27
  TAB: 9
  ENTER: 13

DEFAULT_CALLBACKS =
  before_save: (data) ->
    # if $.isArray data
      data

  # Eval template for every single item in display dropdown menu.
  #
  # @param tpl [String] The template string.
  # @param map [Hash] Data map to eval.
  tpl_eval: (tpl, map) ->
    try
      tpl.replace /#\{([^\}]*)\}/g, (tag, key, pos) -> map[key]
    catch e
      ''

Api =
  reload: (data) ->
    @controller.render_view data
  select: (data) ->
    view  = @controller.view
    # index = @controller.model.index_of data
    $li   = view.$el.find 'li'
    $li.removeClass 'cur'
    # $li.eq(index).addClass 'cur'
    view.choose.call view
  destroy: ->
    @controller.destroy()
    @$selector.data 'diyselect', null
    @$selector.off '.diyselect'

diyselect =
  init: (options) ->
    app = $(this).data 'diyselect'
    if not app
      app = new App(this)
      $(this).data 'diyselect', app
    app.run options
    this

$.fn.diyselect = (method) ->
  _args = arguments
  result = null
  this.filter('select').each ->
    if typeof method is 'object' || !method
      diyselect.init.apply this, _args
    else if Api[method]
      result = Api[method].apply app, Array::slice.call(_args, 1) if app = $(this).data('diyselect')
    else
      $.error "Method #{method} does not exist on jQuery.diyselect"
  result || this

$.fn.diyselect.default =
  width: 'auto'
  limit: 20
  option_tpl: '<div class="option" data-value="#{value}">#{text}</div>'
  group_tpl: '<div class="optgroup" data-group="#{label}"><div class="optgroup-label">#{label}</div></div>'
  callbacks: DEFAULT_CALLBACKS
  max_len: 5
