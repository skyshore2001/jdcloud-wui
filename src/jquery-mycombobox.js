// ====== jquery plugin: mycombobox {{{
/**
@module jquery-mycombobox

@fn jQuery.fn.mycombobox(force?=false)
@key .my-combobox 关联选择框
@var ListOptions 定义关联选择框的数据源

@param force?=false 如果为true, 则调用时强制重新初始化。默认只初始化一次。

关联选择框组件。

用法：先定义select组件：

	<select name="empId" class="my-combobox" data-options="valueField: 'id', ..."></select>

通过data-options可设置选项: { url, formatter(row), loadFilter(data), valueField, textField, jdEnumMap/jdEnumList }

初始化：

	var jo = $(".my-combobox").mycombobox();

注意：使用WUI.showPage或WUI.showDlg显示的逻辑页或对话框中如果有my-combobox组件，会自动初始化，无须再调用上述代码。

操作：

- 刷新列表： jo.trigger("refresh");
- 标记刷新（下次打开时刷新）： jo.trigger("markRefresh", [obj?]); 如果指定obj，则仅当URL匹配obj的查询接口时才刷新。
 （注意：在其它页面进行修改操作时，会自动触发markRefresh事件，以便下拉框能自动刷新。）
- (v5.2)加载列表：jo.trigger("loadOptions", param);  一般用于级联列表，即url带参数的情况。

特性：

- 初始化时调用url指定接口取数据并生成下拉选项。
- 双击可刷新列表。
- 支持数据缓存，不必每次打开都刷新。
- 也支持通过key-value列表初始化(jdEnumMap/jdEnumList选项)
- 自动添加一个空行

注意：

- (v5.0) 接口调用由同步改为异步，以便提高性能并支持batch操作。同步(callSvrSync)便于加载下拉列表后立即为它赋值，改成异步请求(callSvr)后仍支持立即设置值。
- (v5.0) HTML select组件的jQuery.val()方法被改写。当设置不在范围内的值时，虽然下拉框显示为空，其实际值存储在 value_ 字段中，(v5.2) 通过jQuery.val()方法仍可获取到。
 用原生JS可以分别取 this.value 和 this.value_ 字段。

@param opt {url, jdEnumMap/jdEnumList, formatter, textField, valueField, loadFilter, urlParams, isLoaded_, url_, emptyText}

@param opt.url 动态加载使用的url，或一个返回URL的函数（这时会调用opt.url(opt.urlParams)得到实际URL，并保存在opt.url_中）
所以要取URL可以用

	var opt = WUI.getOptions(jo);
	url = opt.url_ || opt.url;

@param opt.emptyText 设置首个空行（值为null）对应的显示文字。

## 用url选项加载下拉列表

例如，想显示所有员工(Employee)的下拉列表，绑定员工编号字段(id)，显示是员工姓名(name):

	分派给 <select name="empId" class="my-combobox" data-options="url:WUI.makeUrl('Employee.query', {res:'id,name',pagesz:-1})"></select>

注意查询默认是有分页的（页大小一般为20条），用参数`{pagesz:-1}`使用服务器设置的最大的页大小（后端最大pagesz默认100，可使用maxPageSz参数调节）。
为了精确控制返回字段与显示格式，data-options可能更加复杂，习惯上定义一个ListOptions变量包含各种下拉框的数据获取方式，便于多个页面上共享，像这样：

	<select name="empId" class="my-combobox" data-options="ListOptions.Emp()"></select>

	var ListOptions = {
		// ListOptions.Emp()
		Emp: function () {
			var opts = {
				url: WUI.makeUrl('Employee.query', {
					res: 'id,name,uname',
					cond: 'storeId=' + g_data.userInfo.storeId,
					pagesz:-1
				}),
				formatter: function (row) { return row.name + '(' + row.uname + ')'; }
			};
			return opts;
		},
		...
	};

返回对象的前两个字段被当作值字段(valueField)和显示字段(textField)，上例中分别是id和name字段。
如果返回对象只有一个字段，则valueField与textField相同，都是这个字段。
如果指定了formatter，则显示内容由它决定，textField此时无意义。

可以显式指定这两个字段，如：

	var opts = {
		valueField: "id",
		textField: "name",
		url: ...
	}

示例2：下拉框绑定User.city字段，可选项为该列已有的值：

	<select name="city" class="my-combobox" data-options="ListOptions.City()"></select>

	var ListOptions = {
		City: function () {
			var opts = {
				url: WUI.makeUrl('User.query', {
					res: 'city',
					cond: 'city IS NOT NULL'
					distinct: 1,
					pagesz:-1
				})
			};
			return opts;
		},
		...
	};

(v5.2) url还可以是一个函数。如果带一个参数，一般用于**动态列表**或**级联列表**。参考后面相关章节。

## 用jdEnumMap选项指定下拉列表

也支持通过key-value列表用jdEnumMap选项或jdEnumList选项来初始化下拉框，如：

	订单状态： <select name="status" class="my-combobox" data-options="jdEnumMap:OrderStatusMap"></select>
	或者：
	订单状态： <select name="status" class="my-combobox" data-options="jdEnumList:'CR:未付款;CA:已取消'"></select>
	或者：(key-value相同时, 只用';'间隔)
	订单状态： <select name="status" class="my-combobox" data-options="jdEnumList:'未付款;已取消'"></select>

其中OrderStatusMap定义如下：

	var OrderStatusMap = {
		"CR": "未付款",
		"CA": "已取消"
	};

## 用loadFilter调整返回数据

另一个例子：在返回列表后，可通过loadFilter修改列表，例如添加或删除项：

	<select name="brandId" class="my-combobox" data-options="ListOptions.Brand()" ></select>

JS代码ListOptions.Brand:

	var ListOptions = {
		...
		// ListOptions.Brand()
		Brand: function () {
			var opts = {
				url:WUI.makeUrl('queryBrand', {res: "id,name", pagesz:-1}),
				loadFilter: function(data) {
					data.unshift({id:'0', name:'所有品牌'});
					return data;
				}
			};
			return opts;
		}
	};

更简单地，这个需求还可以通过同时使用jdEnumMap和url来实现：

	var ListOptions = {
		...
		// ListOptions.Brand()
		Brand: function () {
			var opts = {
				url:WUI.makeUrl('queryBrand', {res: "id,name", pagesz:-1}),
				jdEnumMap: {0: '所有品牌'}
			};
			return opts;
		}
	};

注意：jdEnumMap指定的固定选项会先出现。

## 动态列表

(v5.2) url选项使用函数，之后调用loadOptions方法刷新

示例：在安装任务明细对话框(dlgTask)中，根据品牌(brand)过滤显示相应的门店列表(Store).

	var ListOptions = {
		Store: function () {
			var opts = {
				valueField: "id",
				textField: "name",
				// !!! url使用函数指定, 之后手工给参数调用loadOptions方法刷新 !!!
				url: function (brand) {
					return WUI.makeUrl('Store.query', {
						res: 'id,name',
						cond: "brand='" + brand + "'",
						pagesz: -1
					})
				},
				formatter: function (row) { return row.id + "-" + row.name; }
			};
			return opts;
		}
	};

在明细对话框HTML中：

	<form>
		品牌 <input name="brand">
		门店 <select name="storeId" class="my-combobox" data-options="ListOptions.Store()"></select>
	</form>

对话框初始化函数：在显示对话框或修改品牌后刷新门店列表

	function initDlgTask()
	{
		...
		
		$(frm.brand).on("change", function () {
			if (this.value)
				$(frm.storeId).trigger("loadOptions", this.value);
		});

		function onShow() {
			$(frm.brand).trigger("change");
		}
	}

## 级联列表支持

(v5.2) 与动态列表机制相同。

示例：缺陷类型(defectTypeId)与缺陷代码(defectId)二级关系：选一个缺陷类型，缺陷代码自动刷新为该类型下的代码。
在初始化时，如果字段有值，下拉框应分别正确显示。

在一级内容切换时，二级列表自动从后台查询获取。同时如果是已经获取过的，缓存可以生效不必反复获取。
双击仍支持刷新。

对话框上HTML如下：（defectId是用于提交的字段，所以用name属性；defectTypeId不用提交，所以用了id属性；后端接口最好两个值都返回）

	<select id="defectTypeId" class="my-combobox" data-options="ListOptions.DefectType()" style="width:45%"></select>
	<select name="defectId" class="my-combobox" data-options="ListOptions.Defect()" style="width:45%"></select>

其中，DefectType()与传统设置无区别，在Defect()函数中，应设置url为一个带参函数：

	var ListOptions = {
		DefectType: function () {
			var opts = {
				valueField: "id",
				textField: "code",
				url: WUI.makeUrl('Defect.query', {
					res: 'id,code,name',
					cond: 'typeId is null',
					pagesz: -1
				}),
				formatter: function (row) { return row.code + "-" + row.name; }
			};
			return opts;
		},
		// ListOptions.Defect
		Defect: function () {
			var opts = {
				valueField: "id",
				textField: "code",
				url: function (typeId) {
					return WUI.makeUrl('Defect.query', {
						res: 'id,code,name',
						cond: "typeId=" + typeId,
						pagesz: -1
					})
				},
				formatter: function (row) { return row.code + "-" + row.name; }
			};
			return opts;
		}
	}

在对话框上设置关联动作，调用loadOptions方法：

	$(frm.defectTypeId).on("change", function () {
		var typeId = $(this).val();
		if (typeId)
			$(frm.defectId).trigger("loadOptions", typeId);
	});
	
对话框加载时，手工设置defectTypeId的值：

	function onShow() {
		$(frm.defectTypeId).val(defectTypeId).trigger("change");
	}

 */
var m_dataCache = {}; // url => data
$.fn.mycombobox = mycombobox;
function mycombobox(force) 
{
	var mCommon = jdModule("jdcloud.common");
	this.each(initCombobox);

	function initCombobox(i, o)
	{
		var jo = $(o);
		var opts = WUI.getOptions(jo);
		if (!force && opts.isLoaded_)
			return;

		if (opts.jdEnumMap || opts.jdEnumList) {
			loadOptions();
			opts.isLoaded_ = true;
		}
		else if (opts.url) {
			o.enableAsyncFix = true; // 有这个标志的select才做特殊处理
			loadOptions();

			if (!jo.attr("ondblclick"))
			{
				jo.off("dblclick").dblclick(function () {
					if (! confirm("刷新数据?"))
						return false;
					refresh();
				});
			}
			jo.on("refresh", refresh);
			jo.on("markRefresh", markRefresh);
			jo.on("loadOptions", function (ev, param) {
				opts.urlParams = param;
				loadOptions();
			});
			jo.click(function () {
				if (opts.isLoaded_)
					return;
				loadOptions();
				return false;
			});
			// bugfix: loadOptions中会设置value_, 这将导致无法选择空行.
			jo.change(function () {
				this.value_ = "";
			});
			// 处理只读属性
			jo.keydown(function () {
				if ($(this).attr("readonly"))
					return false;
			});
		}

		function loadOptions()
		{
			jo.prop("value_", jo.val()); // 备份val到value_
			jo.empty();
			// 添加空值到首行
			var j1 = $("<option value=''></option>").appendTo(jo);
			if (opts.emptyText)
				j1.text(opts.emptyText);

			if (opts.jdEnumList) {
				opts.jdEnumMap = mCommon.parseKvList(opts.jdEnumList, ';', ':');
			}
			if (opts.jdEnumMap) {
				$.each(opts.jdEnumMap, function (k, v) {
					var jopt = $("<option></option>")
						.attr("value", k)
						.text(v)
						.appendTo(jo);
				});
			}

			if (opts.url == null)
				return;
			var url = opts.url;
			if ($.isFunction(url)) {
				if (url.length == 0) { // 无参数直接调用
					url = url();
				}
				else if (opts.urlParams != null) {
					url = url(opts.urlParams);
				}
				else if (opts.url_) {
					url = opts.url_;
				}
				else {
					return;
				}
				// 在url为function时，实际url保存在opts.url_中。确保可刷新。
				opts.url_ = url;
			}
			if (m_dataCache[url] === undefined) {
				self.callSvr(url, onLoadOptions);
			}
			else {
				onLoadOptions(m_dataCache[url]);
			}

			function onLoadOptions(data) {
				m_dataCache[url] = data;
				applyData(data);
				// 恢复value; 期间也可能被外部修改。
				jo.val(jo.prop("value_"));
			}
		}

		function applyData(data) 
		{
			opts.isLoaded_ = true;
			function getText(row)
			{
				if (opts.formatter) {
					return opts.formatter(row);
				}
				else if (opts.textField) {
					return row[opts.textField];
				}
				return row.id;
			}
			if (opts.loadFilter) {
				data = opts.loadFilter.call(this, data);
			}
			var arr = $.isArray(data.d)? mCommon.rs2Array(data)
				: $.isArray(data)? data
				: data.list;
			mCommon.assert($.isArray(arr), "bad data format for combobox");
			if (arr.length == 0)
				return;
			var names = Object.getOwnPropertyNames(arr[0]);
			if (opts.valueField == null) {
				opts.valueField = names[0];
			}
			if (opts.formatter == null && opts.textField == null) {
				opts.textField = names[1] || names[0];
			}
			$.each(arr, function (i, row) {
				var jopt = $("<option></option>")
					.attr("value", row[opts.valueField])
					.text(getText(row))
					.appendTo(jo);
			});
		}

		function refresh()
		{
			markRefresh();
			loadOptions();
		}

		function markRefresh(ev, obj)
		{
			var url = opts.url_ || opts.url;
			if (url == null)
				return;
			if (obj) {
				var ac = obj + ".query";
				if (url.action != ac)
					return;
			}
			delete m_dataCache[url];
			opts.isLoaded_ = false;
		}
	}
}

// 问题：在my-combobox获取下拉选项调用尚未返回时，调用val()为其设置值无效。
// 解决：改为设置value_属性，在下拉选项加载完后再调用val().
// 注意：此处基于jQuery.fn.val源码(v1.11)实现，有兼容性风险!!!
function mycombobox_fixAsyncSetValue()
{
	var hook = $.valHooks["select"];
	$.valHooks["select"] = {
		set: function (elem, value) {
			elem.value_ = value;
			return hook.set.apply(this, arguments);
		},
		get: function (elem) {
			if (elem.enableAsyncFix)
				return hook.get.apply(this, arguments) || elem.value_;
			return hook.get.apply(this, arguments);
		}
	}
}
mycombobox_fixAsyncSetValue();
//}}}

