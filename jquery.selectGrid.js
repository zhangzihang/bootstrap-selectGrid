/**
 * 封装下拉表格
 * INPUT标签
 *
 * 使用此插件的input标签必须有id和name属性
 * @author zhangzh
 * @date 2018-10-30
 */
(function ($) {

    //下拉表格对象
    let SelectGrid = function (el, options) {
        this.options = options;
        this.$el = $(el);

        this.init();
    };
    /**
     * columns示例:[{
     * field:"id",
     *  width:"50",
     *  title:"ID",
     *  formatter: function(value, row) {return "aa";}
     * },{
     * field:"id",
     *  width:"50",
     *  title:"ID"
     * }
     *
     * ]
     */
    //下拉表格默认参数
    SelectGrid.DEFAULTS = {
        //普通参数
        panelWidth: "",//下拉面板宽度
        panelHeight: "200px",//下拉面板高度
        idField: undefined,//id字段
        textField: undefined,//显示text字段
        minLength: 0,//最小查询长度
        url: undefined,//可以设置url来初始化下拉树，默认get请求
        columns: [],//显示字段
        queryField: undefined,//查询字段，如设置为dictcode,输入框中值为aac004，则附加参数为{"dictcode":"aac004"}
        initLoad: false,// 是否初始化时加载数据，默认false

        //事件参数
        queryParams: undefined,//请求前触发,参数为reqParams，返回false取消请求
        onBeforeLoad: undefined,//请求成功后，初始化表格前触发,用于处理数据,参数:data，返回处理后结果，返回false取消加载
        onLoadSuccess: undefined,//数据加载完毕后触发，参数:data
        onClickRow: undefined,//点击行，参数:$tr,row
        inputChange: undefined//当输入框中值改变时触发，返回false则不请求后台

    }

    //下拉表格方法
    let allowedMethods = [
        "clearValue",
        "setValue",
        "getValue"
    ];


    SelectGrid.prototype.clearValue = function () {
        this.$el.val("");
        this.$hideInput.val("");
        this.$panelDiv.hide();

        return this.$el;

    }

    SelectGrid.prototype.setValue = function (value) {
        this.$el.val(value);
        this.$hideInput.val(value);
        this.$panelDiv.hide();

        return this.$el;

    }

    SelectGrid.prototype.getValue = function () {
        return this.$hideInput.val();
    }
    //初始化
    SelectGrid.prototype.init = function () {
        //初始化input标签
        this.initInput();
        //初始化下拉框部分
        this.initTable();
        //绑定查询事件
        this.initEvent();
        // 初始化加载
        if (this.options.initLoad) {
            let _self = this;
            let url = _self.options.url;

            let reqParams = {};
            reqParams[_self.options.queryField] = ''
            if (typeof _self.options.queryParams === "function") {
                reqParams = _self.options.queryParams(reqParams);
                if (!reqParams) {
                    return;
                }
            }
            //加载表格数据
            $.getJSON(url, reqParams, function (data) {
                if (typeof _self.options.onBeforeLoad === "function") {
                    data = _self.options.onBeforeLoad(data);
                }
                _self.loadData(data);
            });
        }
    }

    //初始化input，伪装成select
    SelectGrid.prototype.initInput = function () {

        //如果标签是select则选中后赋值给option,否则如果为input则设置为隐藏，并且选中时赋值val
        if (this.$el[0].tagName === 'INPUT') {
            //创建隐藏input存储idField的值

            let $hideInput = $("<input type='hidden' data-select-grid-id='" + this.$el.attr("id")
                + "' class='selectGrid_hideInput' />").attr("name", this.$el.attr("name"));
            this.$el.removeAttr("name").addClass("selectGrid");

            //新建span把input包裹在其中
            let $span = $("<span></span>");
            //添加span到input父元素中
            this.$el.after($span);
            //input放入span
            this.$el.prependTo($span);

            //hideInput放入$el后
            this.$el.after($hideInput);
            let height = parseFloat(this.$el.css("height"));
            //字体图标的字体大小为总高度的30%,top为35%,right为fontSize+12px;
            let $iconSpan = $("<span class='bi-triangle-bottom selectGrid_button' " +
                "style='position:absolute;font-size:" + (height * 0.3) + "px;line-height:" + height + "px;" +
                "right:" + (height * 0.3 + 12) + "px;height:100%' >" +
                "</span>");
            //下拉图标放在右侧
            this.$el.after($iconSpan);

            let _self = this;

            //绑定各种事件
            $iconSpan.click(function () {
                if (_self.$panelDiv.is(":hidden")) {
                    let x = _self.$el.offset().top;
                    let y = _self.$el.offset().left;
                    let height = _self.$el.outerHeight();

                    let top = x + height + 1;
                    let left = y + 1;
                    _self.$panelDiv.css("top", top + "px").css("left", left + "px");
                    _self.$panelDiv.show();
                    _self.$bodyDiv.find("table").css("margin-top", - _self.$headerDiv.outerHeight());
                } else {
                    _self.$panelDiv.hide();
                }
            });


            this.$outerSpan = $span;
            this.$iconSpan = $iconSpan;
            this.$hideInput = $hideInput;


        } else {
            throw new Error("下拉表格只支持input标签！");
        }
    }
    //初始化table
    SelectGrid.prototype.initTable = function () {
        let $panelDiv = $('<div class="selectGrid_body" ></div>');
        this.options.panelWidth = this.options.panelWidth || this.$el.css("width");
        if (!this.options.panelWidth.endsWith("%") && !this.options.panelWidth.endsWith("px")) {
            $panelDiv.css("width", this.options.panelWidth + "px");
        } else {
            $panelDiv.css("width", this.options.panelWidth);
        }


        //下拉表格(固定表头)
        let $tableHeader = $("<table class='table table-bordered' style='margin-bottom:0px'  ></table>");
        //初始化表头
        let columns = this.options.columns;
        let $tr = $("<tr></tr>");
        $.each(columns, function () {
            let field = this.field;
            let title = this.title;
            let width = this.width;
            if (!width.endsWith("%") && !width.endsWith("px")) {
                width = width + "px";
            }
            let $th = $("<th style='border-bottom:0px' ></th>").text(title).attr("data-field", field).css("width", width);
            $tr.append($th);
        });

        //创建固定表头
        let $thead = $("<thead></thead>").append($tr);
        //初始化表头完成
        $tableHeader.append($thead);

        //初始化表体
        let $tableBody = $("<table class='table table-hover table-bordered' style='border-bottom:0'  ></table>");
        $tableBody.append($thead.clone());
        let $tbody = $("<tbody class='selectGrid_tbody' ></tbody>");

        $tableBody.append($tbody);


        let $headerDiv = $("<div class='selectGrid_headerDiv' ></div>").append($tableHeader);
        let $bodyDiv = $('<div class="pre-scrollable selectGrid_bodyDiv"  ></div>').append($tableBody);
        if (!this.options.panelHeight.endsWith("%") && !this.options.panelHeight.endsWith("px")) {
            $bodyDiv.css("max-height", this.options.panelHeight + "px");
        } else {
            $bodyDiv.css("max-height", this.options.panelHeight);
        }
        $("body").append($panelDiv.append($headerDiv).append($bodyDiv));

        //根据$tbody宽度调整$tableHeader宽度
        let scrollWidth = getScrollbarWidth() + "px";
        $tableHeader.css("width", 'calc(100% - ' + scrollWidth + ')');
        //调整tbody的margin-top,为负的(thead的高度+1px，1px为第一层tr的上边框高度)
        $tableBody.css("marginTop", -$headerDiv.outerHeight());


        //绑定各种事件
        let _self = this;
        //绑定行点击选中赋值事件
        $tbody.on("click", "tr:not(.selectGrid_no_result)", function (e) {
            let target = e.target;
            let $tr = $(target).parent();
            let row = $tr.data("selectGrid_row");

            let idField = _self.options.idField;
            let textField = _self.options.textField;
            let value = row[idField];
            let text = row[textField];

            //选中后赋值..
            _self.$hideInput.val(value);
            _self.$el.val(text);
            //改变颜色
            $tbody.find("tr").removeClass("selectGrid_choose_row");
            $tr.addClass("selectGrid_choose_row");


            //关闭表格
            _self.$panelDiv.hide();

            //行选择事件
            if (typeof _self.options.onClickRow === 'function') {
                _self.options.onClickRow($tr, row)
            }

        });

        //绑定失去焦点隐藏
        $("body").click(function (e) {
            let $target = $(e.target);
            //如果点击span之外则隐藏下拉框
            if (!$.contains(_self.$el.parent()[0], $target[0])
                && !$.contains($target[0], _self.$el)) {
                _self.$panelDiv.hide();
            }
        });


        //三个div保存好，方便后续使用
        this.$panelDiv = $panelDiv;
        this.$headerDiv = $headerDiv;
        this.$bodyDiv = $bodyDiv;


    }

    //初始化change事件
    SelectGrid.prototype.initEvent = function () {
        let _self = this;
        //change
        this.$el.bind("input", function (e) {
            let val = $(this).val();
            if (_self.options.inputChange) {
            	if (_self.options.inputChange(_self.$el, val) === false) {
					return;
				}
			}
            //空值默认不查询，除非另外设置
            if (val || _self.options.initLoad) {
                //如果值长度小于最小长度，则返回
                if ($.trim(val).length < _self.options.minLength) {
                    return;
                }
                //显示下拉框
                let x = _self.$el.offset().top;
                let y = _self.$el.offset().left;
                let height = _self.$el.outerHeight();

                let top = x + height + 1;
                let left = y + 1;
                _self.$panelDiv.css("top", top + "px").css("left", left + "px");
                _self.$panelDiv.show();
                _self.$bodyDiv.find("table").css("margin-top", - _self.$headerDiv.outerHeight());
                let url = _self.options.url;

                let reqParams = {};
                reqParams[_self.options.queryField] = val;
                if (typeof _self.options.queryParams === "function") {
                    reqParams = _self.options.queryParams(reqParams);
                    if (!reqParams) {
                        return;
                    }
                }
                //加载表格数据
                $.getJSON(url, reqParams, function (data) {
                    if (typeof _self.options.onBeforeLoad === "function") {
                        data = _self.options.onBeforeLoad(data);
                    }
                    _self.loadData(data);
                });
            }
        });
    }

    //加载数据
    SelectGrid.prototype.loadData = function (data) {

        let $tbody = this.$bodyDiv.find("tbody");
        let $thead = this.$bodyDiv.find("thead");
        let columns = this.options.columns;
        //清空之前的值
        $tbody.empty();

        if (data && data.length > 0) {
            for (let i in data) {
                let $tr = $("<tr></tr>");
                for (let j in columns) {
                    let field = columns[j].field;
                    //let title = columns[j].title;
                    let htmlValue = j.formatter ? j.formatter(data[i][field], data[i]) : data[i][field];
                    let $td = $("<td></td>").html(htmlValue);
                    $tr.append($td);

                }
                $tr.data("selectGrid_row", data[i]);
                $tbody.append($tr);
            }
        } else {
            let $tr = $("<tr class='selectGrid_no_result'></tr>");
            let $td = $("<td></td>").text("查询无结果").attr("colspan", columns.length);
            $tr.append($td);
            $tbody.append($tr);
        }

        //加载完毕，触发onLoadSuccess
        if (typeof this.options.onLoadSuccess === 'function') {
            this.options.onLoadSuccess(data);
        }
    }


    //扩展jQuery
    $.fn.extend({
        selectGrid: function (option) {
            let value,
                args = Array.prototype.slice.call(arguments, 1);


            this.each(function () {

                let $this = $(this),
                    data = $this.data('bootstrap.selectGrid'),
                    options = $.extend({}, SelectGrid.DEFAULTS, $this.data(),
                        typeof option === 'object' && option);

                //如果为string,则为方法调用
                if (typeof option === 'string') {
                    if ($.inArray(option, allowedMethods) < 0) {
                        throw new Error("未知的方法: " + option);
                    }

                    //如果该元素没有附加SelectGrid对象，则为无效调用，直接返回
                    if (!data) {
                        return;
                    }

                    //否则用元素中的SelectGrid对象调用指定方法
                    value = data[option].apply(data, args);

                    //如果为销毁方法，则清除掉元素附加的数据
                    if (option === 'destroy') {
                        $this.removeData('bootstrap.selectGrid');
                    }
                }

                //如果不存在SelectGrid对象，则初始化该元素为SelectGrid
                if (!data) {
                    $this.data('bootstrap.selectGrid', (new SelectGrid(this, options)));
                }
            });

            return value || this;
        }
    });

    //获取滚动条宽度
    function getScrollbarWidth() {
        let odiv = document.createElement('div'),//创建一个div
            styles = {
                width: '100px',
                height: '100px',
                overflowY: 'scroll'//让他有滚动条
            }, i, scrollbarWidth;
        for (i in styles) odiv.style[i] = styles[i];
        document.body.appendChild(odiv);//把div添加到body中
        scrollbarWidth = odiv.offsetWidth - odiv.clientWidth;//相减
        removeNode(odiv);//移除创建的div,兼容ie
        return scrollbarWidth;//返回滚动条宽度
    }

    function removeNode(obj) {
        if (isIE() || isIE11()) {
            obj.removeNode(true);
        } else {
            obj.remove();
        }
    }

    function isIE() {
        return !!window.ActiveXObject || "ActiveXObject" in window;
    }

    function isIE11() {
        return (/Trident\/7\./).test(navigator.userAgent);
    }

    //初始化所有data-select-grid为true的元素
    $(function () {
        $('[data-select-grid="true"]').selectGrid();
    });

})(jQuery);
