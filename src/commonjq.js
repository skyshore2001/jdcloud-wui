jdModule("jdcloud.common", JdcloudCommonJq);
function JdcloudCommonJq()
{
var self = this;

self.assert(window.jQuery, "require jquery lib.");
var mCommon = jdModule("jdcloud.common");

// 原版不支持async函数。此处统一修改做兼容。
$.isFunction = function (o) {
	return typeof(o) == 'function';
};

/**
@fn getFormData(jo, doGetAll)

取DOM对象中带name属性的子对象的内容, 放入一个JS对象中, 以便手工调用callSvr.

注意: 

- 这里Form不一定是Form标签, 可以是一切DOM对象.
- 如果DOM对象有disabled属性, 则会忽略它, 这也与form提交时的规则一致.

与setFormData配合使用时, 可以只返回变化的数据.

	jf.submit(function () {
		var ac = jf.attr("action");
		callSvr(ac, fn, getFormData(jf));
	});

在dialog的onValidate/onOk回调中，由于在显示对话框时自动调用过setFormData，所以用getFormData只返回有修改变化的数据。如果要取所有数据可设置参数doGetAll=true:

	var data = WUI.getFormData(jfrm, true);

这也只返回非disabled的组件，如果包括disabled组件的值也需要，可以用

	var data = WUI.getFormData(jfrm, "all");

如果在jo对象中存在有name属性的file组件(input[type=file][name])，或指定了属性enctype="multipart/form-data"，则调用getFormData会返回FormData对象而非js对象，
再调用callSvr时，会以"multipart/form-data"格式提交数据。一般用于上传文件。
示例：

	<div>
		课程文档
		<input name="pdf" type="file" accept="application/pdf">
	</div>

或传统地：

	<form method="POST" enctype='multipart/form-data'>
		课程文档
		<input name="pdf" type="file" accept="application/pdf">
	</form>

如果有多个同名组件（name相同，且非disabled状态），最终值将以最后组件为准。
如果想要以数组形式返回所有值，应在名字上加后缀"[]"，示例：

	行统计字段: <select name="gres[]" class="my-combobox fields"></select>
	行统计字段2: <select name="gres[]" class="my-combobox fields"></select>
	列统计字段: <select name="gres2" class="my-combobox fields"></select>
	列统计字段2: <select name="gres2" class="my-combobox fields"></select>

取到的结果示例：

	{ gres: ["id", "name"], gres2: "name" }

@see setFormData
 */
self.getFormData = getFormData;
function getFormData(jo, doGetAll)
{
	var data = {};
	var isFormData = false;
	var enctype = jo.attr("enctype");
	if ( (enctype && enctype.toLowerCase() == "multipart/form-data") || jo.has("[name]:file").size() >0) {
		isFormData = true;
		data = new FormData();
	}
	var orgData = jo.data("origin_") || {};
	formItems(jo, function (ji, name, it) {
		if (doGetAll != "all" && it.getDisabled())
			return;
		var orgContent = orgData[name];
		if (orgContent == null)
			orgContent = "";
		var content = it.getValue();
		if (content == null)
			content = "";
		if (doGetAll || content !== String(orgContent)) // 避免 "" == 0 或 "" == false
		{
			if (! isFormData) {
				// URL参数支持数组，如`a[]=hello&a[]=world`，表示数组`a=["hello","world"]`
				if (name.substr(-2) == "[]") {
					name = name.substr(0, name.length-2);
					if (! data[name]) {
						data[name] = [];
					}
					data[name].push(content);
				}
				else {
					data[name] = content;
				}
			}
			else {
				if (ji.is(":file")) {
					// 支持指定multiple，如  <input name="pdf" type="file" multiple accept="application/pdf">
					$.each(ji.prop("files"), function (i, e) {
						data.append(name, e);
					});
				}
				else {
					data.append(name, content);
				}
			}
		}
	});
	return data;
}

/**
@fn getFormData_vf(jo)

专门取虚拟字段的值。例如：

	<select name="whId" class="my-combobox" data-options="url:..., jd_vField:'whName'"></select>

用WUI.getFormData可取到`{whId: xxx}`，而WUI.getFormData_vf遍历带name属性且设置了jd_vField选项的控件，调用接口getValue_vf(ji)来取其显示值。
因而，为支持取虚拟字段值，控件须定义getValue_vf接口。

	<input name="orderType" data-options="jd_vField:'orderType'" disabled>

注意：与getFormData不同，它不忽略有disabled属性的控件。

@see defaultFormItems
 */
self.getFormData_vf = getFormData_vf;
function getFormData_vf(jo)
{
	var data = {};
	formItems(jo, function (ji, name, it) {
		var vname = WUI.getOptions(ji).jd_vField;
		if (!vname)
			return;
		data[vname] = it.getValue_vf();
	});
	return data;
}

/**
@fn formItems(jo, cb)

表单对象遍历。对表单jo（实际可以不是form标签）下带name属性的控件，交给回调cb处理。

注意:

- 通过取getDisabled接口判断，可忽略有disabled属性的控件以及未选中的checkbox/radiobutton。

对于checkbox，设置时根据val确定是否选中；取值时如果选中取value属性否则取value-off属性。
缺省value为"on", value-off为空(非标准属性，本框架支持)，可以设置：

	<input type="checkbox" name="flag" value="1">
	<input type="checkbox" name="flag" value="1" value-off="0">

@param cb(ji, name, it) it.getDisabled/setDisabled/getValue/setValue/getShowbox
当cb返回false时可中断遍历。

示例：

	WUI.formItems(jdlg.find(".my-fixedField"), function (ji, name, it) {
		var fixedVal = ...
		if (fixedVal || fixedVal == '') {
			it.setReadonly(true);
			var forAdd = beforeShowOpt.objParam.mode == FormMode.forAdd;
			if (forAdd) {
				it.setValue(fixedVal);
			}
		}
		else {
			it.setReadonly(false);
		}
	});

@fn getFormItem(ji)

获取对话框上一个组件的访问器。示例，设置名为orderId的组件值：

	var ji = jdlg.find("[name=orderId]"); // 或者用 var ji = $(frm.orderId);
	var it = WUI.getFormItem(ji); // 或者用 var it = ji.gn()
	it.setValue("hello"); // 类似于ji.val("hello")，但支持各种复杂组件

还可以用更简洁的jo.gn，以及支持用链式风格的调用：

	var it = jdlg.gn("orderId");
	it.val("hello").disabled(true); // 等价于 it.setValue("hello");  it.setDisabled(true);

@see jQuery.fn.gn(name?)

@var getFormItemExt

可通过扩展`WUI.getFormItemExt[新类型]`来为表单扩展其它类型控件。示例：

	WUI.getFormItemExt["myinput"] = function (ji) {
		if (ji.hasClass("myinput"))
			return new MyInputFormItem(ji);
	}
	function MyInputFormItem(ji) {
		WUI.FormItem.call(this, ji);
	}
	MyInputFormItem.prototype = $.extend(new WUI.FormItem(), {
		getValue: function () {
			return this.ji.val();
		}
	});
 */
self.formItems = formItems;
self.getFormItemExt = {};
self.getFormItem = getFormItem;
function getFormItem(ji)
{
	var ret;
	$.each(self.getFormItemExt, function (k, ext) {
		var rv = ext(ji);
		if (rv !== undefined) {
			ret = rv;
			return false;
		}
	});
	return ret || new FormItem(ji);
}

self.FormItem = FormItem;
function FormItem(ji) {
	this.ji = ji;
}

// { ji }
FormItem.prototype = {
	getName: function () {
		var jo = this.ji;
		return jo.attr("name") || jo.prop("name");
	},
	getJo: function () {
		return this.ji;
	},
	getDisabled: function () {
		var jo = this.ji;
		var val = jo.prop("disabled");
		if (val === undefined)
			val = jo.attr("disabled");
		var o = jo[0];
		if (! val && o.tagName == "INPUT") {
			if (o.type == "radio" && !o.checked)
				return true;
		}
		return val;
	},
	setDisabled: function (val) {
		var jo = this.ji;
		if (jo.hasClass("easyui-validatebox")) {
			jo.validatebox({disabled: !!val});
			return;
		}
		jo.prop("disabled", !!val);
		if (val)
			jo.attr("disabled", "disabled");
		else
			jo.removeAttr("disabled");
	},
	getReadonly: function () {
		var jo = this.ji;
		var val = jo.prop("readonly");
		if (val === undefined)
			val = jo.attr("readonly");
		return val;
	},
	setReadonly: function (val) {
		var jo = this.ji;
		jo.prop("readonly", !!val);
		if (val)
			jo.attr("readonly", "readonly");
		else
			jo.removeAttr("readonly");
	},
	setValue: function (val) {
		var jo = this.ji;
		var isInput = jo.is(":input");
		if (val === undefined) {
			if (isInput) {
				var o = jo[0];
				// 取初始值
				if (o.tagName === "TEXTAREA")
					val = jo.html();
				else if (! (o.tagName == "INPUT") && (o.type == "hidden")) // input[type=hidden]对象比较特殊：设置property value后，attribute value也会被设置。
					val = jo.attr("value");
				if (val === undefined)
					val = "";
			}
			else {
				val = "";
			}
		}
		if ($.isArray(val) || $.isPlainObject(val)) {
			val = JSON.stringify(val);
		}

		if (jo.is(":checkbox")) {
			jo.prop("checked", mCommon.tobool(val));
		}
		else if (isInput) {
			jo.val(val);
		}
		else {
			jo.html(val);
		}
	},
	getValue: function (jo) {
		var jo = this.ji;
		var val;
		if (jo.is(":checkbox")) {
			val = jo.prop("checked")? jo.val(): jo.attr("value-off");
			if (val === "on")
				val = 1;
			/* NOTE: 复选框特别行为：如果不选则无值
			if (val === undefined)
				val = 0;
			*/
		}
		else if (jo.is(":input")) {
			val = jo.val();
			if (val)
				val = val.trim();
		}
		else {
			val = jo.html();
		}
		return val;
	},
	// 用于find模式设置。搜索"设置find模式"/datetime
	getShowbox: function () {
		return this.ji;
	},

	// 用于显示的虚拟字段值, 此处以select为例，适用于my-combobox
	getValue_vf: function () {
		var jo = this.ji;
		var o = jo[0];
		if (o.tagName == "SELECT")
			return o.selectedIndex >= 0 ? o.options[o.selectedIndex].innerText : '';
		return this.getValue(jo);
	},
	getTitle: function () {
		return this.ji.closest("td").prev("td").html();
	},
	setTitle: function (val) {
		this.ji.closest("td").prev("td").html(val);
	},
	setFocus: function () {
		var j1 = this.getShowbox();
		if (j1.is(":hidden")) {
			selectTab(j1);
		}
		j1.focus();
	},

	// 链式接口
	val: function (v) {
		if (v === undefined)
			return this.getValue();
		this.setValue(v);
		return this;
	},
	disabled: function (v) {
		if (v === undefined)
			return this.getDisabled();
		this.setDisabled(v);
		return this;
	},
	readonly: function (v) {
		if (v === undefined)
			return this.getReadonly();
		this.setReadonly(v);
		return this;
	},
	visible: function (v) {
		var jp = this.ji.closest("tr,.wui-field");
		if (v === undefined) {
			return this.getShowbox().css("display") != "none" && jp.css("display") != "none";
			//return jp.is(":visible");
		}
		jp.toggle(!!v);
		return this;
	},
	setOption: function (v) {
		if (!$.isPlainObject(v))
			return;
		this.getJo().trigger("setOption", v);
		return this;
		// for: combo, subobj
		//WUI.setOptions(ji, v);
	}
};

// jo是tabs下的某个组件
function selectTab(jo)
{
	var jtabs = jo.closest(".easyui-tabs");
	if (jtabs.size() == 0)
		return;
	var idx = -1;
	jtabs.find(">.tabs-panels>.panel").each(function (idx1) {
		if (jo.closest(this).size() > 0) {
			idx = idx1;
			return true;
		}
	});
	if (idx < 0)
		return;
	jtabs.tabs("select", idx);
}

/**
@fn jQuery.fn.gn(name?)

按名字访问组件（gn表示getElementByName），返回访问器（iterator），用于对各种组件进行通用操作。

示例：

	var it = jdlg.gn("orderId"); 
	var v = it.val(); // 取值，相当于 jdlg.find("[name=orderId]").val(); 但兼容my-combobox, wui-combogrid, wui-subobj等复杂组件。
	it.val(100); // 设置值
	// it.val([100, "ORDR-100"]); // 对于combogrid, 可以传数组，同时设置value和text

	var isVisible = it.visible(); // 取是否显示
	it.visible(false); // 设置隐藏

	var isDisabled = it.disabled();
	it.disabled(true);

	var isReadonly = it.readonly();
	it.readonly(true);

如果未指定name，则以jQuery对象本身作为组件返回访问器。所以也可以这样用：

	var jo = jdlg.find("[name=orderId]");
	var it = jo.gn(); // name可以省略，表示取自身
	it.val(100);

*/
jQuery.fn.gn = function (name) {
	var ji = name? this.find("[name=" + name + "],.wui-subobj-" + name): this;
	return WUI.getFormItem(ji);
}

/*
// 倒序遍历对象obj, 用法与$.each相同。
function eachR(obj, cb)
{
	var arr = [];
	for (var prop in obj) {
		arr.push(prop);
	}
	for (var i=arr.length-1; i>=0; --i) {
		var v = obj[arr[i]];
		if (cb.call(v, arr[i], v) === false)
			break;
	}
}
*/

function formItems(jo, cb, sel)
{
	if (sel == null)
		sel = "[name]";
	var jiList = jo.filter(sel).add(jo.find(sel));
	jiList.each (function () {
		var it = getFormItem($(this));
		var name = it.getName();
		if (! name)
			return;
		var ji = it.getJo(); // 原jquery对象, 一般与$(this)相同，但像combo这类可能不同
		if (cb(ji, name, it) === false) {
			return false;
		}
	});
}

/**
@fn setFormData(jo, data?, opt?)

用于为带name属性的DOM对象设置内容为data[name].
要清空所有内容, 可以用 setFormData(jo), 相当于增强版的 form.reset().

注意:
- DOM项的内容指: 如果是input/textarea/select等对象, 内容为其value值; 如果是div组件, 内容为其innerHTML值.
- 当data[name]未设置(即值为undefined, 注意不是null)时, 对于input/textarea等组件, 行为与form.reset()逻辑相同, 
 即恢复为初始化值。（特别地，form.reset无法清除input[type=hidden]对象的内容, 而setFormData可以)
 对div等其它对象, 会清空该对象的内容.
- 如果对象设置有属性"noReset", 则不会对它进行设置.

@param opt {setOrigin?=false, setOnlyDefined?=false}

@param opt.setOrigin 为true时将data设置为数据源, 这样在getFormData时, 只会返回与数据源相比有变化的数据.
缺省会设置该DOM对象数据源为空.

@param opt.setOnlyDefined 设置为true时，只设置form中name在data中存在的项，其它项保持不变；而默认是其它项会清空。

对象关联的数据源, 可以通过 jo.data("origin_") 来获取, 或通过 jo.data("origin_", newOrigin) 来设置.

示例：

	<div id="div1">
		<p>订单描述：<span name="dscr"></span></p>
		<p>状态为：<input type=text name="status"></p>
		<p>金额：<span name="amount"></span>元</p>
	</div>

Javascript:

	var data = {
		dscr: "筋斗云教程",
		status: "已付款",
		amount: "100"
	};
	var jo = $("#div1");
	var data = setFormData(jo, data); 
	$("[name=status]").html("已完成");
	var changedData = getFormData(jo); // 返回 { dscr: "筋斗云教程", status: "已完成", amount: "100" }

	var data = setFormData(jo, data, {setOrigin: true}); 
	$("[name=status]").html("已完成");
	var changedData = getFormData(jo); // 返回 { status: "已完成" }
	$.extend(jo.data("origin_"), changedData); // 合并变化的部分到数据源.

@see getFormData
 */
self.setFormData = setFormData;
function setFormData(jo, data, opt)
{
	var opt1 = $.extend({
		setOrigin: false
	}, opt);
	if (data == null)
		data = {};
	formItems(jo, function (ji, name, it) {
		if (ji.attr("noReset"))
			return;
		var content = data[name];
		if (opt1.setOnlyDefined && content === undefined)
			return;
		it.setValue(content);
	});
	jo.data("origin_", opt1.setOrigin? data: null);
}

/**
@fn loadScript(url, fnOK?, ajaxOpt?)

@param fnOK 加载成功后的回调函数
@param ajaxOpt 传递给$.ajax的额外选项。

默认未指定ajaxOpt时，简单地使用添加script标签机制异步加载。如果曾经加载过，可以重用cache。

注意：再次调用时是否可以从cache中取，是由服务器的cache-control决定的，在web和web/page目录下的js文件一般是禁止缓存的，再次调用时会从服务器再取，若文件无更改，服务器会返回304状态。
这是因为默认我们使用Apache做服务器，在相应目录下.htaccess中配置有缓存策略。

如果指定ajaxOpt，且非跨域，则通过ajax去加载，可以支持同步调用。如果是跨域，仍通过script标签方式加载，注意加载完成后会自动删除script标签。

返回defered对象(与$.ajax类似)，可以用 dfd.then() / dfd.fail() 异步处理。

常见用法：

- 动态加载一个script，异步执行其中内容：

		loadScript("1.js", onload); // onload中可使用1.js中定义的内容
		loadScript("http://otherserver/path/1.js"); // 跨域加载

- 加载并立即执行一个script:

		loadScript("1.js", {async: false});
		// 可立即使用1.js中定义的内容
	
	注意：如果是跨域加载，不支持同步调用（$.ajax的限制），如：

		loadScript("http://oliveche.com/1.js", {async: false});
		// 一旦跨域，选项{async:false}指定无效，不可立即使用1.js中定义的内容。

示例：在菜单中加一项“工单工时统计”，动态加载并执行一个JS文件：
store.html中设置菜单：

				<a href="javascript:;" onclick="WUI.loadScript('page/mod_工单工时统计.js')">工单工时统计</a>
	
在`page/mod_工单工时统计.js`文件中写报表逻辑，`mod`表示一个JS模块文件，示例：

	function show工单工时统计()
	{
		DlgReportCond.show(function (data) {
			var queryParams = WUI.getQueryParam({createTm: [data.tm1, data.tm2]});
			var url = WUI.makeUrl("Ordr.query", { res: 'id 工单号, code 工单码, createTm 生产日期, itemCode 产品编码, itemName 产品名称, cate2Name 产品系列, itemCate 产品型号, qty 数量, mh 理论工时, mh1 实际工时', pagesz: -1 });
			WUI.showPage("pageSimple", "工单工时统计!", [url, queryParams, onInitGrid]);
		});
	}
	show工单工时统计();

如果JS文件修改了，点菜单时可以实时执行最新的内容。

如果要动态加载script，且使用后删除标签（里面定义的函数会仍然保留），建议直接使用`$.getScript`，它等同于：

	loadScript("1.js", {cache: false});

**[小技巧]**

在index.js/app.js等文件中写代码，必须刷新整个页面才能加载生效。
可以先把代码写在比如 web/test.js 中，这样每次修改后不用大刷新，直接在chrome控制台上加载运行：

	WUI.loadScript("test.js")

等改好了再拷贝到真正想放置这块代码的地方。修改已有的框架中函数也可以这样来快速迭代。
*/
self.loadScript = loadScript;
function loadScript(url, fnOK, options)
{
	if ($.isPlainObject(fnOK)) {
		options = fnOK;
		fnOK = null;
	}
	if (options) {
		var ajaxOpt = $.extend({
			dataType: "script",
			cache: true,
			success: fnOK,
			url: url,
			error: function (xhr, textStatus, err) {
				console.error("*** loadScript fails for " + url);
				console.error(err);
			}
		}, options);

		return jQuery.ajax(ajaxOpt);
	}

	var dfd_ = $.Deferred();
	var script= document.createElement('script');
	script.type= 'text/javascript';
	script.src= url;
	script.async = false; // 用于确保执行的先后顺序. 动态创建的script其async值默认为true（因而可能后加载的先执行导致错误），而直接写页面里的script标签默认async为false. 注意该属性与异步加载文件无关，加载都是异步的。
	script.onload = function () {
		if (fnOK)
			fnOK();
		dfd_.resolve();
	}
	script.onerror = function () {
		dfd_.reject();
		console.error("*** loadScript fails for " + url);
	}
	document.head.appendChild(script);
	return dfd_;
}

/**
@fn evalOptions(_source, ctx?, errPrompt?)

执行JS代码，返回JS对象，示例：

	source='{a: 1, b:"hello", c: function () {} }'
	前面允许有单行注释，如
	source='// comment\n {a: 1, b:"hello", c: function () {} }'

JS代码一般以花括号开头。在用于DOM属性时，也允许没有花括号的这种写法，如：

	<div data-options="a:1,b:'hello',c:true"></div>

上例可返回 `{a:1, b:'hello', c:true}`.

也支持各种表达式及函数调用，如：

	<div data-options="getSomeOption()"></div>

更复杂的，如果代码不只是一个选项，前面还有其它JS语句，则返回最后一行语句的值，
最后一行可以是变量、常量、函数调用等，但不可以是花括号开头的选项，对选项须用括号包起来：

	function hello() { }
	({a: 1, b:"hello", c: hello })

或：

	function hello() { }
	var ret={a: 1, b:"hello", c: hello }
	ret

传入的参数变量ctx可以在代码中使用，用于框架与扩展代码的交互，如：

	{a: 1, b:"hello", c: ctx.fn1() }

执行出错时错误显示在控制台。调用者可回调处理错误。

	evalOptions(src, null, function (ex) {
		app_alert("文件" + url + "出错: " + ex);
	});

注意：受限于浏览器，若使用`try { eval(str) } catch(ex) {}` 结构会导致原始的错误行号丢失，
为了避免大量代码中有错误时调试困难，在大于1行代码时，不使用try-catch，而是直接抛出错误。
 */
self.evalOptions = evalOptions;
function evalOptions(_source, ctx, onError)
{
	// "a:1, b:'hello'"
	if (/^\w+:/.test(_source)) {
		_source = "({" + _source + "})";
	}
	// "{a:1, b:'hello'}" 且前面可以有单行注释
	else if (/^(\s*\/\/[^\n]*\n)*\s*\{/.test(_source)) {
		_source = "(" + _source + ")";
	}
	if (_source.indexOf("\n") > 0)
		return eval(_source);

	try {
		return eval(_source);
	}
	catch (ex) {
		console.error(ex);
		if (onError) {
			onError(ex);
		}
		else {
			app_alert("代码错误: " + ex, "e");
		}
	}
}

/**
@fn loadJson(url, fnOK, options)

从远程获取JSON结果. 
注意: 与$.getJSON不同, 本函数不直接调用JSON.parse解析结果, 而是将返回当成JS代码使用eval执行得到JSON结果再回调fnOK.

示例:

	WUI.loadJson("1.js", function (data) {
		// handle json value `data`
	});

1.js可以是返回任意JS对象的代码, 如:

	// 可以有注释
	{
		a: 2 * 3600,
		b: "hello",
		// c: {}
		d: function () {
		},
	}

复杂地，可以定义变量、函数，注意最后返回值对象要用小括号把返回对象括起来，如：

	var schema = {
		title: "菜单配置",
	};

	function onReady() {
	}

	({
		schema: schema,
		onReady: onReady
	})

建议用模块方式来写，即用`(function() { ... return ... })()`把定义内容包起来，这样变量和函数不会污染全局空间：

	(function () {
	var schema = ...
	function onReady() {...}
	return {
		schema: schema,
		onReady: onReady
	}
	})();

不处理结果时, 则该函数与$.getScript效果类似.

@param options 参考$.ajax参数

@options.async 默认为异步，设置`{async:false}`表示同步调用。

@see evalOptions
 */
self.loadJson = loadJson;
function loadJson(url, fnOK, options)
{
	var ajaxOpt = $.extend({
		dataType: "text",
		jdFilter: false,
		success: function (data) {
			var val = self.evalOptions(data, null, function (ex) {
				app_alert("文件" + url + "出错: " + ex, "e");
			});
			fnOK.call(this, val);
		}
	}, options);
	return $.ajax(url, ajaxOpt);
}

/**
@fn loadCss(url)

动态加载css文件, 示例:

	WUI.loadCss("lib/bootstrap.min.css");

 */
self.loadCss = loadCss;
function loadCss(url)
{
	var jo = $('<link type="text/css" rel="stylesheet" />').attr("href", url);
	jo.appendTo($("head"));
}

/**
@fn setDateBox(jo, defDateFn?)

设置日期框, 如果输入了非法日期, 自动以指定日期(如未指定, 用当前日期)填充.

	setDateBox($("#txtComeDt"), function () { return genDefVal()[0]; });

 */
self.setDateBox = setDateBox;
function setDateBox(jo, defDateFn)
{
	jo.blur(function () {
		var dt = self.parseDate(this.value);
		if (dt == null) {
			if (defDateFn)
				dt = defDateFn();
			else
				dt = new Date();
		}
		this.value = dt.format("D");
	});
}

/**
@fn setTimeBox(jo, defTimeFn?)

设置时间框, 如果输入了非法时间, 自动以指定时间(如未指定, 用当前时间)填充.

	setTimeBox($("#txtComeTime"), function () { return genDefVal()[1]; });

 */
self.setTimeBox = setTimeBox;
function setTimeBox(jo, defTimeFn)
{
	jo.blur(function () {
		var dt = self.parseTime(this.value);
		if (dt == null) {
			if (defTimeFn)
				dt = defTimeFn();
			else
				dt = new Date();
		}
		this.value = dt.format("HH:MM");
	});
}

/**
@fn waitFor(deferredObj)

用于简化异步编程. 可将不易读的回调方式改写为易读的顺序执行方式.

	var dfd = $.getScript("http://...");
	function onSubmit()
	{
		dfd.then(function () {
			foo();
			bar();
		});
	}

可改写为:

	function onSubmit()
	{
		if (waitFor(dfd)) return;
		foo();
		bar();
	}

*/
self.waitFor = waitFor;
function waitFor(dfd)
{
	if (waitFor.caller == null)
		throw "waitFor MUST be called in function!";

	if (dfd.state() == "resolved")
		return false;

	if (!dfd.isset_)
	{
		var caller = waitFor.caller;
		var args = caller.arguments;
		dfd.isset_ = true;
		dfd.then(function () { caller.apply(this, args); });
	}
	return true;
}

/**
@fn rgb(r,g,b)

生成"#112233"形式的颜色值.

	rgb(255,255,255) -> "#ffffff"

 */
self.rgb = rgb;
function rgb(r,g,b,a)
{
	if (a === 0) // transparent (alpha=0)
		return;
	return '#' + pad16(r) + pad16(g) + pad16(b);

	function pad16(n) {
		var ret = n.toString(16);
		return n>16? ret: '0'+ret;
	}
}

/**
@fn rgb2hex(rgb)

将jquery取到的颜色转成16进制形式，如："rgb(4, 190, 2)" -> "#04be02"

示例：

	var color = rgb2hex( $(".mui-container").css("backgroundColor") );

 */
self.rgb2hex = rgb2hex;
function rgb2hex(rgbFormat)
{
	var rgba = rgb; // function rgb or rgba
	try {
		return eval(rgbFormat);
	} catch (ex) {
		console.log(ex);
	}
/*
	var ms = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
	if (ms == null)
		return;
	var hex = "#";
	for (var i = 1; i <= 3; ++i) {
		var s = parseInt(ms[i]).toString(16);
		if (s.length == 1) {
			hex += "0" + s;
		}
		else {
			hex += s;
		}
	}
	return hex;
*/
}

/**
@fn jQuery.fn.jdata(val?)

和使用$.data()差不多，更好用一些. 例：

	$(o).jdata().hello = 100;
	$(o).jdata({hello:100, world:200});

*/
$.fn.jdata = function (val) {
	if (val != null) {
		this.data("jdata", val);
		return val;
	}
	var jd = this.data("jdata");
	if (jd == null)
		jd = this.jdata({});
	return jd;
}

/**
@fn compressImg(img, cb, opt)

通过限定图片大小来压缩图片，用于图片预览和上传。
不支持IE8及以下版本。

- img: Image对象
- cb: Function(picData) 回调函数
- opt: {quality=0.8, maxSize=1280, mimeType?="image/jpeg"}
- opt.maxSize: 压缩完后宽、高不超过该值。为0表示不压缩。
- opt.quality: 0.0-1.0之间的数字。
- opt.mimeType: 输出MIME格式。

函数cb的回调参数: picData={b64src,blob,w,h,w0,h0,quality,name,mimeType,size0,size,b64size,info}

b64src为base64格式的Data URL, 如 "data:image/jpeg;base64,/9j/4AAQSk...", 用于给image或background-image赋值显示图片；

可以赋值给Image.src:

	var img = new Image();
	img.src = picData.b64src;

或

	$("<div>").css("background-image", "url(" + picData.b64src + ")");

blob用于放到FormData中上传：

	fd.append('file', picData.blob, picData.name);

其它picData属性：

- w0,h0,size0分别为原图宽、高、大小; w,h,size为压缩后图片的宽、高、大小。
- quality: jpeg压缩质量,0-1之间。
- mimeType: 输出的图片格式
- info: 提示信息，会在console中显示。用于调试。

**[预览和上传示例]**

HTML:

	<form action="upfile.php">
		<div class="img-preview"></div>
		<input type="file" /><br/>
		<input type="submit" >
	</form>

用picData.b64src来显示预览图，并将picData保存在img.picData_属性中，供后面上传用。

	var jfrm = $("form");
	var jpreview = jfrm.find(".img-preview");
	var opt = {maxSize:1280};
	jfrm.find("input[type=file]").change(function (ev) {
		$.each(this.files, function (i, fileObj) {
			compressImg(fileObj, function (picData) {
				$("<img>").attr("src", picData.b64src)
					.prop("picData_", picData)
					.appendTo(jpreview);
				//$("<div>").css("background-image", "url("+picData.b64src+")").appendTo(jpreview);
			}, opt);
		});
		this.value = "";
	});

上传picData.blob到服务器

	jfrm.submit(function (ev) {
		ev.preventDefault();

		var fd = new FormData();
		var idx = 1;
		jpreview.find("img").each(function () {
			// 名字要不一样，否则可能会覆盖
			fd.append('file' + idx, this.picData_.blob, this.picData_.name);
			++idx;
		});
	 
		$.ajax({
			url: jfrm.attr("action"),
			data: fd,
			processData: false,
			contentType: false,
			type: 'POST',
			// 允许跨域调用
			xhrFields: {
				withCredentials: true
			},
			success: cb
		});
		return false;
	});

参考：JIC.js (https://github.com/brunobar79/J-I-C)

TODO: 用完后及时释放内存，如调用revokeObjectURL等。
 */
self.compressImg = compressImg;
function compressImg(fileObj, cb, opt)
{
	var opt0 = {
		quality: 0.8,
		maxSize: 1280,
		mimeType: "image/jpeg"
	};
	opt = $.extend(opt0, opt);

	// 部分旧浏览器使用BlobBuilder的（如android-6.0, mate7自带浏览器）, 压缩率很差。不如直接上传。而且似乎是2M左右文件浏览器无法上传，导致服务器收不到。
	window.BlobBuilder = (window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder);
 	var doDowngrade = !window.Blob 
			|| window.BlobBuilder;
	if (doDowngrade) {
		var rv = {
			name: fileObj.name,
			size: fileObj.size,
			b64src: window.URL.createObjectURL(fileObj),
			blob: fileObj,
		};
		rv.info = "compress ignored. " + rv.name + ": " + (rv.size/1024).toFixed(0) + "KB";
		console.log(rv.info);
		cb(rv);
		return;
	}

	var img = new Image();
	// 火狐7以下版本要用 img.src = fileObj.getAsDataURL();
	img.src = window.URL.createObjectURL(fileObj);
	img.onload = function () {
		var rv = resizeImg();
		rv.info = "compress " + rv.name + " q=" + rv.quality + ": " + rv.w0 + "x" + rv.h0 + "->" + rv.w + "x" + rv.h + ", " + (rv.size0/1024).toFixed(0) + "KB->" + (rv.size/1024).toFixed(0) + "KB(rate=" + (rv.size / rv.size0 * 100).toFixed(2) + "%,b64=" + (rv.b64size/1024).toFixed(0) + "KB)";
		console.log(rv.info);
		cb(rv);
	}

	// return: {w, h, quality, size, b64src}
	function resizeImg()
	{
		var w = img.naturalWidth, h = img.naturalHeight;
		if (opt.maxSize<w || opt.maxSize<h) {
			if (w > h) {
				h = Math.round(h * opt.maxSize / w);
				w = opt.maxSize;
			}
			else {
				w = Math.round(w * opt.maxSize / h);
				h = opt.maxSize;
			}
		}

		var cvs = document.createElement('canvas');
		cvs.width = w;
		cvs.height = h;

		var ctx = cvs.getContext("2d").drawImage(img, 0, 0, w, h);
		var b64src = cvs.toDataURL(opt.mimeType, opt.quality);
		var blob = getBlob(b64src);
		// 无压缩效果，则直接用原图
		if (blob.size > fileObj.size) {
			blob = fileObj;
			// b64src = img.src;
			opt.mimeType = fileObj.type;
		}
		// 如果没有扩展名或文件类型发生变化，自动更改扩展名
		var fname = getFname(fileObj.name, opt.mimeType);
		return {
			w0: img.naturalWidth,
			h0: img.naturalHeight,
			w: w,
			h: h,
			quality: opt.quality,
			mimeType: opt.mimeType,
			b64src: b64src,
			name: fname,
			blob: blob,
			size0: fileObj.size,
			b64size: b64src.length,
			size: blob.size
		};
	}

	function getBlob(b64src) 
	{
		var bytes = window.atob(b64src.split(',')[1]); // "data:image/jpeg;base64,{b64data}"
		//var ab = new ArrayBuffer(bytes.length);
		var ia = new Uint8Array(bytes.length);
		for(var i = 0; i < bytes.length; i++){
			ia[i] = bytes.charCodeAt(i);
		}
		var blob;
		try {
			blob = new Blob([ia.buffer], {type: opt.mimeType});
		}
		catch(e){
			// TypeError old chrome and FF
			if (e.name == 'TypeError' && window.BlobBuilder){
				var bb = new BlobBuilder();
				bb.append(ia.buffer);
				blob = bb.getBlob(opt.mimeType);
			}
			else{
				// We're screwed, blob constructor unsupported entirely   
			}
		}
		return blob;
	}

	function getFname(fname, mimeType)
	{
		var exts = {
			"image/jpeg": ".jpg",
			"image/png": ".png",
			"image/webp": ".webp"
		};
		var ext1 = exts[mimeType];
		if (ext1 == null)
			return fname;
		return fname.replace(/(\.\w+)?$/, ext1);
	}
}

/**
@fn triggerAsync(jo, ev, paramArr)

触发含有异步操作的事件，在异步事件完成后继续。兼容同步事件处理函数，或多个处理函数中既有同步又有异步。
返回Deferred对象，或false表示要求取消之后操作。

@param ev 事件名，或事件对象$.Event()

示例：以事件触发方式调用jo的异步方法submit:

	var dfd = WUI.triggerAsync(jo, 'submit');
	if (dfd === false)
		return;
	dfd.then(doNext);

	function doNext() { }

jQuery对象这样提供异步方法：triggerAsync会用事件对象ev创建一个dfds数组，将Deferred对象存入即可支持异步调用。

	jo.on('submit', function (ev) {
		var dfd = $.ajax("upload", ...);
		if (ev.dfds)
			ev.dfds.push(dfd);
	});

*/
self.triggerAsync = triggerAsync;
function triggerAsync(jo, ev, paramArr)
{
	if (typeof(ev) == "string") {
		ev = $.Event(ev);
	}
	ev.dfds = [];
	jo.trigger(ev, paramArr);
	if (ev.isDefaultPrevented())
		return false;
	return $.when.apply(this, ev.dfds);
}

/**
@fn $.Deferred
@alias Promise
兼容Promise的接口，如then/catch/finally
 */
var fnDeferred = $.Deferred;
$.Deferred = function () {
	var ret = fnDeferred.apply(this, arguments);
	ret.catch = ret.fail;
	ret.finally = ret.always;
	var fn = ret.promise;
	ret.promise = function () {
		var r = fn.apply(this, arguments);
		r.catch = r.fail;
		r.finally = r.always;
		return r;
	}
	return ret;
}

// 返回筋斗云后端query接口可接受的cond条件。可能会修改cond(如果它是数组)
function appendCond(cond, cond1)
{
	if (!cond) {
		if ($.isArray(cond1))
			return $.extend(true, [], cond1);
		if ($.isPlainObject(cond1))
			return $.extend(true, {}, cond1);
		return cond1;
	}
	if (!cond1)
		return cond;

	if ($.isArray(cond)) {
		cond.push(cond1);
	}
	else if (typeof(cond) == "string" && typeof(cond1) == "string") {
		cond += " AND (" + cond1 + ")";
	}
	else {
		cond = [cond, cond1];
	}
	return cond;
}

// 类似$.extend，但对cond做合并而不是覆盖处理. 将修改并返回target
self.extendQueryParam = extendQueryParam;
function extendQueryParam(target, a, b)
{
	var cond;
	$.each(arguments, function (i, e) {
		if (i == 0) {
			cond = target.cond;
		}
		else if ($.isPlainObject(e)) {
			cond = appendCond(cond, e.cond);
			$.extend(target, e);
		}
	});
	if (cond) {
		target.cond = cond;
	}
	return target;
}

/**
@fn makeTree(arr, idField="id", fatherIdField="fatherId", childrenField="children")

将array转成tree. 注意它会修改arr（添加children属性），但返回新的数组。

	var ret = WUI.makeTree([
		{id: 1},
		{id: 2, fatherId: 1},
		{id: 3, fatherId: 2},
		{id: 4, fatherId: 1}
	]);

结果：

	ret = [
		{id: 1, children:  [
			{id: 2, fatherId: 1, children:  [
				{id: 3, fatherId: 2},
			],
			{id: 4, fatherId: 1}
		]
	]
 */
self.makeTree = makeTree;
function makeTree(arr, idField, fatherIdField, childrenField)
{
	if (idField == null)
		idField = "id";
	if (fatherIdField == null)
		fatherIdField = "fatherId";
	if (childrenField == null)
		childrenField = "children";
	var ret = [];
	$.each(arr, function (i, e) {
		var fid = e[fatherIdField];
		if (fid == null) {
			ret.push(e);
			return;
		}
		var found = false;
		$.each(arr, function (i1, e1) {
			if (fid == e1[idField]) {
				if (e1[childrenField] == null) {
					e1[childrenField] = [];
				}
				e1[childrenField].push(e);
				found = true;
				return false;
			}
		});
		if (! found)
			ret.push(e);
	});
	return ret;
}

// ==== jQuery.base64Encode/base64Decode
(function ($) {

    var keyString = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

    var utf8Encode = function (string) {
        string = string.replace(/\x0d\x0a/g, "\x0a");
        var output = "";
        for (var n = 0; n < string.length; n++) {
            var c = string.charCodeAt(n);
            if (c < 128) {
                output += String.fromCharCode(c);
            } else if ((c > 127) && (c < 2048)) {
                output += String.fromCharCode((c >> 6) | 192);
                output += String.fromCharCode((c & 63) | 128);
            } else {
                output += String.fromCharCode((c >> 12) | 224);
                output += String.fromCharCode(((c >> 6) & 63) | 128);
                output += String.fromCharCode((c & 63) | 128);
            }
        }
        return output;
    };

    var utf8Decode = function (input) {
        var string = "";
        var i = 0;
        var c = 0, c2 = 0, c3 = 0;
        while (i < input.length) {
            c = input.charCodeAt(i);
            if (c < 128) {
                string += String.fromCharCode(c);
                i++;
            } else if ((c > 191) && (c < 224)) {
                c2 = input.charCodeAt(i + 1);
                string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            } else {
                c2 = input.charCodeAt(i + 1);
                c3 = input.charCodeAt(i + 2);
                string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }
        }
        return string;
    };

    $.extend(self, {
        base64Encode:function (input, enhance) {
            var output = "";
            var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
            var i = 0;
            input = utf8Encode(input);
            var key = keyString;
            if (enhance) {
                var n = enhance == 2? (input.length%64 +1): self.randInt(1,63);
                var n1 = (n+input.length) % 64;
                key = key.substr(n,64-n) + key.substr(0, n) + ' '; // last is changed to space for trim
                output = keyString.charAt(n) + key.charAt(n1);
            }
            while (i < input.length) {
                chr1 = input.charCodeAt(i++);
                chr2 = input.charCodeAt(i++);
                chr3 = input.charCodeAt(i++);
                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;
                if (isNaN(chr2)) {
                    enc3 = enc4 = 64;
                } else if (isNaN(chr3)) {
                    enc4 = 64;
                }
                output = output + key.charAt(enc1) + key.charAt(enc2) + key.charAt(enc3) + key.charAt(enc4);
            }
            if (enhance)
                output = output.trim().replace(/[+]/g, '-');
            return output;
        },
        base64Decode:function (input) {
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;
            input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
            while (i < input.length) {
                enc1 = keyString.indexOf(input.charAt(i++));
                enc2 = keyString.indexOf(input.charAt(i++));
                enc3 = keyString.indexOf(input.charAt(i++));
                enc4 = keyString.indexOf(input.charAt(i++));
                chr1 = (enc1 << 2) | (enc2 >> 4);
                chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                chr3 = ((enc3 & 3) << 6) | enc4;
                output = output + String.fromCharCode(chr1);
                if (enc3 != 64) {
                    output = output + String.fromCharCode(chr2);
                }
                if (enc4 != 64) {
                    output = output + String.fromCharCode(chr3);
                }
            }
            output = utf8Decode(output);
            return output;
        }
    });
    return 0;
})(jQuery);

}

