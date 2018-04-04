function JdcloudPage()
{
var self = this;
// 模块内共享
self.ctx = self.ctx || {};

var mCommon = jdModule("jdcloud.common");

mCommon.assert($.fn.combobox, "require jquery-easyui lib.");

// TODO: remove.
// dlg中与数据库表关联的字段的name应以_开头，故调用add_转换；
// 但如果字段名中间有"__"表示非关联到表的字段，不做转换，这之后该字段不影响数据保存。
function add_(o)
{
	// return $.extend(true, {}, o);
	var ret = {};
	for (var k in o) {
		if (k.indexOf("__") < 0)
			ret[k] = o[k];
	}
	return ret;
}

function getRow(jtbl)
{
	var row = jtbl.datagrid('getSelected');   
	if (! row)
	{
		self.app_alert("请先选择一行。", "w");
		return null;
	}
	return row;
}

/** 
@fn reload(jtbl, url?, queryParams?) 
*/
self.reload = reload;
function reload(jtbl, url, queryParams)
{
	if (url != null || queryParams != null) {
		var opt = jtbl.datagrid("options");
		if (url != null) {
			opt.url = url;
		}
		if (queryParams != null) {
			opt.queryParams = queryParams;
		}
	}

	// 如果当前页面不是table所在页，则先切换到所在页
	if (jtbl.is(":hidden")) {
		var opage = mCommon.getAncestor(jtbl[0], istab);
		if (opage && opage.title)
			$(opage).closest(".easyui-tabs").tabs("select", opage.title);
	}

	resetPageNumber(jtbl);
	jtbl.datagrid('reload');
	jtbl.datagrid('clearSelections');
}

/** 
@fn reloadTmp(jtbl, url?, queryParams?) 
临时reload一下，完事后恢复原url
*/
self.reloadTmp = reloadTmp;
function reloadTmp(jtbl, url, queryParams)
{
	var opt = jtbl.datagrid("options");
	var url_bak = opt.url;
	var param_bak = opt.queryParams;

	reload(jtbl, url, queryParams);

	// restore param
	opt.url = url_bak;
	opt.queryParams = param_bak;
}

// 筋斗云协议的若干列表格式转为easyui-datagrid的列表格式
// 支持 [], { @list}, { @h, @d}格式 => {total, @rows}
function jdListToDgList(data)
{
	var ret = data;
	// support simple array
	if ($.isArray(data)) {
		ret = {
			total: data.length,
			rows: data
		};
	}
	else if ($.isArray(data.list)) {
		ret = {
			total: data.total || data.list.length,
			rows: data.list
		};
	}
	// support compressed table format: {h,d}
	else if (data.h !== undefined)
	{
		var arr = mCommon.rs2Array(data);
		ret = {
			total: data.total || arr.length,
			rows: arr
		};
	}
	return ret;
}

// 筋斗云协议的列表转为数组，支持 [], {list}, {h,d}格式
function jdListToArray(data)
{
	var ret = data;
	// support simple array
	if ($.isArray(data)) {
		ret = data;
	}
	else if ($.isArray(data.list)) {
		ret = data.list;
	}
	// support compressed table format: {h,d}
	else if (data.h !== undefined)
	{
		ret = mCommon.rs2Array(data);
	}
	return ret;
}

/** 
@fn reloadRow(jtbl, rowData)
@param rowData must be the original data from table row
 */
self.reloadRow = reloadRow;
function reloadRow(jtbl, rowData)
{
	jtbl.datagrid("loading");
	var opt = jtbl.datagrid("options");
	self.callSvr(opt.url, api_queryOne, {cond: "id=" + rowData.id});

	function api_queryOne(data) 
	{
		jtbl.datagrid("loaded");
		var idx = jtbl.datagrid("getRowIndex", rowData);
		var objArr = jdListToArray(data);
		if (idx != -1 && objArr.length == 1) {
			// NOTE: updateRow does not work, must use the original rowData
// 			jtbl.datagrid("updateRow", {index: idx, row: data[0]});
			for (var k in rowData) 
				delete rowData[k];
			$.extend(rowData, objArr[0]);
			jtbl.datagrid("refreshRow", idx);
		}
	}
}

function appendRow(jtbl, id)
{
	jtbl.datagrid("loading");
	var opt = jtbl.datagrid("options");
	self.callSvr(opt.url, api_queryOne, {cond: "id=" + id});

	function api_queryOne(data)
	{
		jtbl.datagrid("loaded");
		var objArr = jdListToArray(data);
		if (objArr.length != 1)
			return;
		var row = objArr[0];
		if (opt.sortOrder == "desc")
			jtbl.datagrid("insertRow", {index:0, row: row});
		else
			jtbl.datagrid("appendRow", row);
	}
}

function tabid(title)
{
	return "pg_" + title.replace(/[ ()\[\]]/g, "_");
}
function istab(o)
{
	var id = o.getAttribute("id");
	return id && id.substr(0,3) == "pg_";
}

// // 取jquery-easyui dialog 对象
// function getDlg(o)
// {
// 	return getAncestor(o, function (o) {
// 		return o.className && o.className.indexOf('window-body') >=0;
// 	});
// }

// function closePage(title)
// {
// 	var o = $("#pg_" + title).find("div");
// 	if (o.length > 0) {
// 		alert(o[0].id);
// 		o.appendTo($("#hidden_pages"));
// 		alert("restore");
// 	}
// }

// paramArr?
function callInitfn(jo, paramArr)
{
	if (jo.jdata().init)
		return;

	var attr = jo.attr("my-initfn");
	if (attr == null)
		return;

	try {
		initfn = eval(attr);
	}
	catch (e) {
		self.app_alert("bad initfn: " + attr, "e");
	}

	if (initfn)
	{
		console.log("### initfn: " + attr);
		initfn.apply(jo, paramArr || []);
	}
	jo.jdata().init = true;
}

function getModulePath(file)
{
	return self.options.pageFolder + "/" + file;
}

/** 
@fn showPage(pageName, title?, paramArr?)
@param pageName 由page上的class指定。
@param title? 如果未指定，则使用page上的title属性.
@param paramArr? 调用initfn时使用的参数，是一个数组。

新页面以title作为id。
注意：每个页面都是根据pages下相应pageName复制出来的，显示在一个新的tab页中。相同的title当作同一页面。
初始化函数由page上的my-initfn属性指定。

page定义示例: 

	<div id="my-pages" style="display:none">
		<div class="pageHome" title="首页" my-initfn="initPageHome"></div>
	</div>

page调用示例:

	WUI.showPage("pageHome");
	WUI.showPage("pageHome", "首页");
	WUI.showPage("pageHome", "首页2");

*/
self.showPage = showPage;
function showPage(pageName, title, paramArr)
{
	var sel = "#my-pages > div." + pageName;
	var jpage = $(sel);
	if (jpage.length > 0) {
		initPage();
	}
	else {
		sel = "#tpl_" + pageName;
		var html = $(sel).html();
		if (html) {
			loadPage(html, pageName, null);
			return;
		}

		//jtab.append("开发中");

		//self.enterWaiting(); // NOTE: leaveWaiting in initPage
		var pageFile = getModulePath(pageName + ".html");
		$.ajax(pageFile).then(function (html) {
			loadPage(html, pageName, pageFile);
		}).fail(function () {
			//self.leaveWaiting();
		});
	}

	function initPage()
	{
		if (title == null)
			title = jpage.attr("title") || "无标题";

		var tt = self.tabMain;
		if (tt.tabs('exists', title)) {
			tt.tabs('select', title);
			return;
		}

		var id = tabid(title);
		var content = "<div id='" + id + "' title='" + title + "' />";
		var closable = (pageName != self.options.pageHome);

		tt.tabs('add',{
	// 		id: id,
			title: title,
			closable: closable,
			fit: true,
			content: content
		});

		var jtab = $("#" + id);

		var jpageNew = jpage.clone().appendTo(jtab);
		jpageNew.addClass('wui-page');
		jpageNew.attr("wui-pageName", pageName);

		$.parser.parse(jpageNew); // easyui enhancement
		self.enhanceWithin(jpageNew);
		callInitfn(jpageNew, paramArr);

		jpageNew.trigger('pagecreate');
		jpageNew.trigger('pageshow');
	}

	function loadPage(html, pageClass, pageFile)
	{
		// 放入dom中，以便document可以收到pagecreate等事件。
		var jcontainer = $("#my-pages");
	// 	if (m_jstash == null) {
	// 		m_jstash = $("<div id='muiStash' style='display:none'></div>").appendTo(self.container);
	// 	}
		// 注意：如果html片段中有script, 在append时会同步获取和执行(jquery功能)
		jpage = $(html).filter("div");
		if (jpage.size() > 1 || jpage.size() == 0) {
			console.log("!!! Warning: bad format for page '" + pageClass + "'. Element count = " + jpage.size());
			jpage = jpage.filter(":first");
		}

		// 限制css只能在当前页使用
		jpage.find("style").each(function () {
			$(this).html( self.ctx.fixPageCss($(this).html(), "." + pageClass) );
		});
		// bugfix: 加载页面页背景图可能反复被加载
		jpage.find("style").attr("wui-origin", pageClass).appendTo(document.head);

/**
@key wui-pageFile

动态加载的逻辑页(或对话框)具有该属性，值为源文件名。
*/
		jpage.attr("wui-pageFile", pageFile);
		jpage.addClass(pageClass).appendTo(jcontainer);

		var val = jpage.attr("wui-script");
		if (val != null) {
			var path = getModulePath(val);
			var dfd = mCommon.loadScript(path, initPage);
			dfd.fail(function () {
				self.app_alert("加载失败: " + val);
				self.leaveWaiting();
				//history.back();
			});
		}
		else {
			initPage();
		}
	}
}

/**
@fn closeDlg(jdlg) 
*/
self.closeDlg = closeDlg;
function closeDlg(jdlg)
{
	jdlg.dialog("close");
}

function openDlg(jdlg)
{
	jdlg.dialog("open");
// 	jdlg.find("a").focus(); // link button
}

function focusDlg(jdlg)
{
	var jo;
	jdlg.find(":input[type!=hidden]").each(function (i, o) {
		var jo1 = $(o);
		if (! jo1.prop("disabled") && ! jo1.prop("readonly")) {
			jo = jo1;
			return false;
		}
	});
	if (jo == null) 
		jo = jdlg.find("a button");

	// !!!! 在IE上常常focus()无效，故延迟做focus避免被别的obj抢过
	if (jo)
		setTimeout(function(){jo.focus()}, 50);
}

// setup "Enter" and "Cancel" key for OK and Cancel button on the dialog
$.fn.okCancel = function (fnOk, fnCancel) {
	this.unbind("keydown").keydown(function (e) {
		if (e.keyCode == 13 && e.target.tagName != "TEXTAREA" && fnOk) {
			fnOk();
			return false;
		}
		else if (e.keyCode == 27 && fnCancel) {
			fnCancel();
			return false;
		}
		// Ctrl-F: find mode
		else if (e.ctrlKey && e.which == 70)
		{
			showObjDlg($(this), FormMode.forFind, null);
			return false;
		}
/* // Ctrl-A: add mode
		else if (e.ctrlKey && e.which == 65)
		{
			showObjDlg($(this), FormMode.forAdd, null);
			return false;
		}
*/
	});
}

/**
@fn showDlg(jdlg, opt?)

@param jdlg 可以是jquery对象，也可以是selector字符串或DOM对象，比如 "#dlgOrder".
注意：当对话框动态从外部加载时，jdlg=$("#dlgOrder") 一开始会为空数组，这时也可以调用该函数，且调用后jdlg会被修改为实际加载的对话框对象。

@param opt?={url, buttons, noCancel=false, okLabel="确定", cancelLabel="取消", modal=true, reset=true, validate=true, data, onOk, onSubmit}

- opt.url: String. 点击确定后，提交到后台的URL。如果设置则自动提交数据，否则应在opt.onOk回调或validate事件中手动提交。
- opt.buttons: Object数组。用于添加“确定”、“取消”按钮以外的其它按钮，如`[{text: '下一步', iconCls:'icon-ok', handler: btnNext_click}]`。
 用opt.okLabel/cancelLabel可修改“确定”、“取消”按钮的名字，用opt.noCancel=true可不要“取消”按钮。
- opt.model: Boolean.模态对话框，这时不可操作对话框外其它部分，如登录框等。设置为false改为非模态对话框。
- opt.data: Object. 自动加载的数据, 将自动填充到对话框上带name属性的DOM上。在修改对象时，仅当与opt.data有差异的数据才会传到服务端。
- opt.reset: Boolean. 显示对话框前先清空。
- opt.validate: Boolean. 是否提交前用easyui-form组件验证数据。内部使用。
- opt.onSubmit: Function(data) 自动提交前回调。用于验证或补齐提交数据，返回false可取消提交。opt.url为空时不回调。
- opt.onOk: Function(jdlg, data?) 如果自动提交(opt.url非空)，则服务端接口返回数据后回调，data为返回数据。如果是手动提交，则点确定按钮时回调，没有data参数。

对话框有两种编程模式，一是通过opt参数在启动对话框时设置属性及回调函数(如onOk)，另一种是在dialog初始化函数中处理事件(如validate事件)实现逻辑，有利于独立模块化。

对于自动提交数据的对话框(设置了opt.url)，提交数据过程中回调函数及事件执行顺序为：

	事件validate; // 提交前，用于验证或设置提交数据。返回false或ev.preventDefault()可取消提交，中止以下代码执行。
	opt.onSubmit(); // 提交前，验证或设置提交数据，返回false将阻止提交。
	... 框架通过callSvr自动提交数据，如添加、更新对象等。
	opt.onOk(jdlg, data); // 提交且服务端返回数据后。data是服务端返回数据。
	事件retdata; // 与onOk类似。

对于手动提交数据的对话框(opt.url为空)，执行顺序为：

	事件validate; // 用于验证、设置提交数据、提交数据。
	opt.onOk(jdlg); // 同上

注意：

- 参数opt可在beforeshow事件中设置，这样便于在对话框模块中自行设置选项，包括okLabel, onOk回调等等。
- 旧版本中的回调 opt.onAfterSubmit() 回调已删除，请用opt.onOk()替代。

调用此函数后，对话框将加上以下CSS Class:
@key .wui-dialog 标识WUI对话框的类名。

**对象型对话框与formMode**

函数showObjDlg()会调用本函数显示对话框，称为对象型对话框，用于对象增删改查，它将以下操作集中在一起，并设置相应的formMode：

- 查询(FormMode.forFind)
- 显示及更新(FormMode.forSet)
- 添加(FormMode.forAdd)
- 删除(FormMode.forDel)，但实际上不会打开对话框

注意：

- 可通过`var formMode = jdlg.jdata().mode;`来获取当前对话框模式。
- 非对象型对话框的formMode为空。
- 对象型对话框由框架自动设置各opt选项，一般不应自行修改opt，而是通过处理对话框事件实现逻辑。

对象型对话框事件：

	beforeshow(formMode, opt)事件。显示对话框前触发。可以通过设置opt参数定制对话框，与调用showDlg时传入opt参数相同效果。通过修改opt.data可为字段设置缺省值。
	show(formMode, opt.data)事件。显示对话框后触发。这时opt.data已经设置到对话框上带name属性的DOM组件中，一些不能直接显示的字段，可在此时设置到DOM组件上，比如图片等。
	validate(formMode, opt.data)事件。用于提交前验证、补齐数据等。返回false可取消提交。
	retdata(data, formMode)事件。服务端返回结果时触发。注意forFind模式不会触发。

初始数据与对话框中带name属性的对象相关联，详见
@see setFormData,getFormData

注意：

- 旧版本中的initdata, loaddata, savedata将废弃，应分别改用beforeshow, show, validate事件替代，注意事件参数及检查对话框模式。

**对话框事件**

@key beforeshow Function(ev, formMode, opt)  对话框显示前事件
opt参数即showDlg的opt参数，可在此处修改.

注意：每次调用showDlg()都会回调，可能这时对话框已经在显示。

@key show Function(ev, formMode, initData)  对话框显示后事件.
用于设置DOM组件。
注意如果在beforeshow事件中设置DOM，对于带name属性的组件会在加载数据时值被覆盖回去，对它们在beforeshow中只能通过设置opt.data来指定缺省值。

@key retdata Function(ev, data, formMode) form提交后事件，用于处理返回数据

以下事件将废弃：
@key initdata Function(ev, initData, formMode) 加载数据前触发。可修改要加载的数据initData, 用于为字段设置缺省值。将废弃，改用beforeshow事件。
@key loaddata Function(ev, initData, formMode) form加载数据后，一般用于将服务端数据转为界面显示数据。将废弃，改用show事件。
@key savedata Function(ev, formMode, initData) 对于设置了opt.url的窗口，将向后台提交数据，提交前将触发该事件，用于验证或补足数据（修正某个）将界面数据转为提交数据. 返回false或调用ev.preventDefault()可阻止form提交。将废弃，改用validate事件。

@see example-dialog 在对话框中使用事件

**reset控制**

对话框上有name属性的组件在显示对话框时会自动清除（除非设置opt.reset=false或组件设置有noReset属性）。

@key .my-reset 标识在显示对话框时应清除
对于没有name属性（不与数据关联）的组件，可加该CSS类标识要求清除。
例如，想在forSet模式下添加显示内容, 而在forFind/forAdd模式下时清除内容这样的需求。

	<div class="my-reset">...</div>

@key [noReset]
某些字段希望设置后一直保留，不要被清空，可以设置noReset属性，例如：

	<input type="hidden" name="status" value="PA" noReset>

 */
self.showDlg = showDlg;
function showDlg(jdlg, opt) 
{
	if (jdlg.constructor != jQuery)
		jdlg = $(jdlg);
	if (loadDialog(jdlg, onLoad))
		return;
	function onLoad() {
		showDlg(jdlg, opt);
	}

	opt = $.extend({
		okLabel: "确定",
		cancelLabel: "取消",
		noCancel: false,
		modal: true,
		reset: true,
		validate: true
	}, opt);

	jdlg.addClass('wui-dialog');
	callInitfn(jdlg);

	// TODO: 事件换成jdlg触发，不用jfrm
	var jfrm = jdlg.find("form:first");
	var formMode = jdlg.jdata().mode;
	jfrm.trigger("beforeshow", [formMode, opt]);

	var btns = [{text: opt.okLabel, iconCls:'icon-ok', handler: fnOk}];
	if (! opt.noCancel) 
		btns.push({text: opt.cancelLabel, iconCls:'icon-cancel', handler: fnCancel})
	if ($.isArray(opt.buttons))
		btns.push.apply(btns, opt.buttons);

	var dlgOpt = {
//		minimizable: true,
		maximizable: true,
		collapsible: true,
		resizable: true,

		// reset default pos.
		left: null,
		top: null,

		closable: ! opt.noCancel,
		modal: opt.modal,
		buttons: btns
	};
	if (jdlg.is(":visible")) {
		dlgOpt0 = jdlg.dialog("options");
		$.extend(dlgOpt, {
			left: dlgOpt0.left,
			top: dlgOpt0.top
		});
	}
	jdlg.dialog(dlgOpt);

	jdlg.okCancel(fnOk, opt.noCancel? undefined: fnCancel);

	if (opt.reset)
	{
		mCommon.setFormData(jdlg); // reset
		// !!! NOTE: setFormData or form.reset does not reset hidden items, which causes data is not cleared for find mode !!!
		jdlg.find("[type=hidden]:not([noReset])").val("");
		jdlg.find(".my-reset").empty();
	}
	if (opt.data)
	{
		jfrm.trigger("initdata", [opt.data, formMode]); // TODO: remove. 用beforeshow替代。
		//jfrm.form("load", opt.data);
		var setOrigin = (formMode == FormMode.forSet);
		mCommon.setFormData(jdlg, opt.data, {setOrigin: setOrigin});
		jfrm.trigger("loaddata", [opt.data, formMode]); // TODO: remove。用show替代。
// 		// load for jquery-easyui combobox
// 		// NOTE: depend on jeasyui implementation. for ver 1.4.2.
// 		jfrm.find("[comboname]").each (function (i, e) {
// 			$(e).combobox('setValue', opt.data[$(e).attr("comboname")]);
// 		});
	}

// 	openDlg(jdlg);
	focusDlg(jdlg);
	jfrm.trigger("show", [formMode, opt.data]);

	function fnCancel() {closeDlg(jdlg)}
	function fnOk()
	{
		var ret = opt.validate? jfrm.form("validate"): true;
		if (! ret)
			return false;

		var ev = $.Event("validate");
		jfrm.trigger(ev, [formMode, opt.data]);
		if (ev.isDefaultPrevented())
			return false;

		// TODO: remove. 用validate事件替代。
		var ev = $.Event("savedata");
		jfrm.trigger(ev, [formMode, opt.data]);
		if (ev.isDefaultPrevented())
			return false;

		if (opt.url) {
			var data = mCommon.getFormData(jdlg);
			if (opt.onSubmit && opt.onSubmit(data) === false)
				return false;

			self.callSvr(opt.url, success, data);
		}
		else {
			opt.onOk && opt.onOk.call(jdlg);
		}
		// opt.onAfterSubmit && opt.onAfterSubmit(jfrm); // REMOVED

		function success (data)
		{
			if (data != null && opt.onOk) {
				opt.onOk.call(jdlg, data);
				jfrm.trigger('retdata', [data, formMode]);
			}
		}
	}
}

/**
@fn getTopDialog()

取处于最上层的对话框。如果没有，返回jo.size() == 0
*/
self.getTopDialog = getTopDialog;
function getTopDialog()
{
	var val = 0;
	var jo = $();
	$(".window:visible").each(function (i, e) {
		var z = parseInt(this.style.zIndex);
		if (z > val) {
			val = z;
			jo = $(this).find(".wui-dialog");
		}
	});
	return jo;
}

/**
@fn unloadPage(pageName?)

@param pageName 如未指定，表示当前页。

删除一个页面。一般用于开发过程，在修改外部逻辑页后，调用该函数删除页面。此后载入页面，可以看到更新的内容。

注意：对于内部逻辑页无意义。
*/
self.unloadPage = unloadPage;
function unloadPage(pageName)
{
	if (pageName == null) {
		pageName = self.getActivePage().attr("wui-pageName");
		if (pageName == null)
			return;
		self.tabClose();
	}
	// 不要删除内部页面
	var jo = $("."+pageName);
	if (jo.attr("wui-pageFile") == null)
		return;
	jo.remove();
	$("style[wui-origin=" + pageName + "]").remove();
}

/**
@fn reloadPage()

重新加载当前页面。一般用于开发过程，在修改外部逻辑页后，调用该函数可刷新页面。
*/
self.reloadPage = reloadPage;
function reloadPage()
{
	var pageName = self.getActivePage().attr("wui-pageName");
	self.unloadPage();
	self.showPage(pageName);
}

/**
@fn unloadDialog()
@alias reloadDialog

删除当前激活的对话框。一般用于开发过程，在修改外部对话框后，调用该函数清除以便此后再载入页面，可以看到更新的内容。

注意：

- 对于内部对话框调用本函数无意义。直接关闭对话框即可。
- 由于不知道打开对话框的参数，reloadDialog无法重新打开对话框，因而它的行为与unloadDialog一样。
*/
self.unloadDialog = unloadDialog;
self.reloadDialog = unloadDialog;
function unloadDialog()
{
	var jdlg = getTopDialog();
	if (jdlg.size() == 0)
		return;
	closeDlg(jdlg);

	// 是内部对话框，不做删除处理
	if (jdlg.attr("wui-pageFile") == null)
		return;
	var dlgId = jdlg.attr("id");
	jdlg.dialog("destroy");
	$("style[wui-origin=" + dlgId + "]").remove();
}

// ---- object CRUD {{{
var BTN_TEXT = ["添加", "保存", "保存", "查找", "删除"];
// e.g. var text = BTN_TEXT[mode];

function getFindData(jfrm)
{
	var kvList = {};
	var kvList2 = {};
	jfrm.find(":input[name]").each(function(i,e) {
		if ($(e).hasClass("notForFind"))
			return;
		var v = $(e).val();
		if (v == null || v === "")
			return;
		if ($(e).hasClass("wui-notCond"))
			kvList2[e.name] = v;
		else
			kvList[e.name] = v;
	})
	var param = self.getQueryParam(kvList);
	if (kvList2) 
		$.extend(param, kvList2);
	return param;
}

/*
加载jdlg(当它的size为0时)，注意加载成功后会添加到jdlg对象中。
返回true表示将动态加载对话框，调用者应立即返回，后续逻辑在onLoad回调中操作。

	if (loadDialog(jdlg, onLoad))
		return;

	function onLoad() {
		showDlg(jdlg...);
	}
*/
function loadDialog(jdlg, onLoad)
{
	// 判断dialog未被移除
	if (jdlg.size() > 0 && jdlg[0].parentElement != null && jdlg[0].parentElement.parentElement != null)
		return;
	var jo = $(jdlg.selector);
	if (jo.size() > 0) {
		fixJdlg(jo);
		return;
	}

	function fixJdlg(jo)
	{
		jdlg.splice(0, jdlg.size(), jo[0]);
	}

	var dlgId = jdlg.selector.substr(1);
	var sel = "#tpl_" + dlgId;
	var html = $(sel).html();
	if (html) {
		loadDialogTpl(html, dlgId, pageFile);
		return;
	}

	var pageFile = getModulePath(dlgId + ".html");
	$.ajax(pageFile).then(function (html) {
		loadDialogTpl(html, dlgId, pageFile);
	})
	.fail(function () {
		//self.leaveWaiting();
	});

	function loadDialogTpl(html, dlgId, pageFile)
	{
		var jcontainer = $("#my-pages");
		// 注意：如果html片段中有script, 在append时会同步获取和执行(jquery功能)
		var jo = $(html).filter("div");
		if (jo.size() > 1 || jo.size() == 0) {
			console.log("!!! Warning: bad format for dialog '" + selector + "'. Element count = " + jo.size());
			jo = jo.filter(":first");
		}

		fixJdlg(jo);
		// 限制css只能在当前页使用
		jdlg.find("style").each(function () {
			$(this).html( self.ctx.fixPageCss($(this).html(), jdlg.selector) );
		});
		// bugfix: 加载页面页背景图可能反复被加载
		jdlg.find("style").attr("wui-origin", dlgId).appendTo(document.head);
		jdlg.attr("id", dlgId).appendTo(jcontainer);
		jdlg.attr("wui-pageFile", pageFile);

		$.parser.parse(jdlg); // easyui enhancement
		self.enhanceWithin(jdlg);

		var val = jdlg.attr("wui-script");
		if (val != null) {
			var path = getModulePath(val);
			var dfd = mCommon.loadScript(path, onLoad);
			dfd.fail(function () {
				self.app_alert("加载失败: " + val);
			});
		}
		else {
			onLoad();
		}
	}
	return true;
}

/**
@fn showObjDlg(jdlg, mode, opt?={jtbl, id})

@param jdlg 可以是jquery对象，也可以是selector字符串或DOM对象，比如 "#dlgOrder". 注意：当对话框保存为单独模块时，jdlg=$("#dlgOrder") 一开始会为空数组，这时也可以调用该函数，且调用后jdlg会被修改为实际加载的对话框对象。

@param opt.id String. mode=link时必设，set/del如缺省则从关联的opt.jtbl中取, add/find时不需要
@param opt.jdbl Datagrid. dialog/form关联的datagrid -- 如果dlg对应多个tbl, 必须每次打开都设置

事件参考：
@see showDlg
*/
self.showObjDlg = showObjDlg;
function showObjDlg(jdlg, mode, opt)
{
	opt = opt || {};
	if (jdlg.constructor != jQuery)
		jdlg = $(jdlg);
	if (loadDialog(jdlg, onLoad))
		return;
	function onLoad() {
		showObjDlg(jdlg, mode, opt);
	}

	if (opt.jtbl) {
		jdlg.jdata().jtbl = opt.jtbl;
	}
	var id = opt.id;

// 一些参数保存在jdlg.jdata(), 
// mode: 上次的mode
// 以下参数试图分别从jdlg.jdata()和jtbl.jdata()上取. 当一个dlg对应多个tbl时，应存储在jtbl上。
// init_data: 用于add时初始化的数据 
// url_param: 除id外，用于拼url的参数
	var obj = jdlg.attr("my-obj");
	mCommon.assert(obj);
	var jd = jdlg.jdata();
	var jd2 = jd.jtbl && jd.jtbl.jdata();

	// get id
	var rowData;
	if (id == null) {
		if (mode == FormMode.forSet || mode == FormMode.forDel) // get dialog data from jtbl row, 必须关联jtbl
		{
			mCommon.assert(jd.jtbl);
			rowData = getRow(jd.jtbl);
			if (rowData == null)
				return;
			id = rowData.id;
		}
	}

	var url;
	if (mode == FormMode.forAdd) {
		url = self.makeUrl([obj, "add"], jd.url_param);
		if (jd.jtbl) 
			jd.jtbl.datagrid("clearSelections");
	}
	else if (mode == FormMode.forSet) {
		url = self.makeUrl([obj, "set"], {id: id});
	}
	else if (mode == FormMode.forDel) {
		self.app_confirm("确定要删除一条记录?", function (b) {
			if (! b)
				return;

			var ac = obj + ".del";
			self.callSvr(ac, {id: id}, function(data) {
				if (jd.jtbl)
					reload(jd.jtbl);
				self.app_show('删除成功!');
			});
		});
		return;
	}

	callInitfn(jdlg);
	var jfrm = jdlg.find("Form");

	// 设置find模式
	var doReset = ! (jd.mode == FormMode.forFind && mode == FormMode.forFind) // 一直是find, 则不清除
	if (mode == FormMode.forFind && jd.mode != FormMode.forFind) {
		jfrm.find(":input[name]").each (function (i,e) {
			var je = $(e);
			var bak = je.jdata().bak = {
				disabled: je.prop("disabled"),
				title: je.prop("title"),
				type: null
			}
			if (je.hasClass("notForFind") || je.attr("notForFind") != null) {
				je.prop("disabled", true);
				je.css("backgroundColor", "");
			}
			else {
				je.prop("disabled", false);
				je.addClass("mui-find-field");
				je.prop("title", self.queryHint);
				var type = je.attr("type");
				if (type && ["number", "date", "time", "datetime"].indexOf(type) >= 0) {
					bak.type = type;
					je.attr("type", "text");
				}
			}
		});
		jfrm.find(".easyui-validatebox").validatebox("disableValidation");
	}
	else if (jd.mode == FormMode.forFind && mode != FormMode.forFind) {
		jfrm.find(":input[name]").each (function (i,e) {
			var je = $(e);
			var bak = je.jdata().bak;
			je.prop("disabled", bak.disabled);
			je.removeClass("mui-find-field");
			je.prop("title", bak.title);
			if (bak.type) {
				je.attr("type", bak.type);
			}
		})
		jfrm.find(".easyui-validatebox").validatebox("enableValidation");
	}

	jd.mode = mode;

	// load data
	var load_data;
	if (mode == FormMode.forAdd) {
		var init_data = jd.init_data || (jd2 && jd2.init_data);
		if (init_data)
			load_data = add_(init_data);
		else
			load_data = {};
	}
	else if (mode == FormMode.forSet) {
		if (rowData) {
			load_data = add_(rowData);
		}
		else {
			var load_url = self.makeUrl([obj, 'get'], {id: id});
			var data = self.callSvrSync(load_url);
			if (data == null)
				return;
			load_data = add_(data);
		}
	}
	// open the dialog
	showDlg(jdlg, {
		url: url,
		okLabel: BTN_TEXT[mode],
		validate: mode!=FormMode.forFind,
		modal: false,  // mode == FormMode.forAdd || mode == FormMode.forSet
		reset: doReset,
		data: load_data,
		onSubmit: onSubmit,
		onOk: onOk
	});

	if (mode == FormMode.forSet)
		jfrm.form("validate");

	function onSubmit(data) {
		// 没有更新时直接关闭对话框
		if (mode == FormMode.forSet) {
			if ($.isEmptyObject(data)) {
				closeDlg(jdlg);
				return false;
			}
		}
	}
	function onOk (retData) {
		if (mode==FormMode.forFind) {
			var param = getFindData(jfrm);
			mCommon.assert(jd.jtbl); // 查询结果显示到jtbl中
			// 归并table上的cond条件. dgOpt.url是makeUrl生成的，保存了原始的params
			var dgOpt = jd.jtbl.datagrid("options");
			if (param.cond && dgOpt && dgOpt.url && dgOpt.url.params && dgOpt.url.params.cond) {
				param.cond = dgOpt.url.params.cond + " AND (" + param.cond + ")";
			}
			reload(jd.jtbl, undefined, param);
			return;
		}
		// add/set/link
		// TODO: add option to force reload all (for set/add)
		if (jd.jtbl) {
			if (mode == FormMode.forSet && rowData)
				reloadRow(jd.jtbl, rowData);
			else if (mode == FormMode.forAdd) {
				appendRow(jd.jtbl, retData);
			}
			else
				reload(jd.jtbl);
		}
		if (mode == FormMode.forAdd)
		{
			showObjDlg(jdlg, mode); // reset and add another
		}
		else
		{
			closeDlg(jdlg);
		}
		self.app_show('操作成功!');
	}
}

/**
@fn dg_toolbar(jtbl, jdlg, button_lists...)

@param jdlg 可以是对话框的jquery对象，或selector如"#dlgOrder".

设置easyui-datagrid上toolbar上的按钮。缺省支持的按钮有r(refresh), f(find), a(add), s(set), d(del), 可通过以下设置方式修改：

	// jtbl.jdata().toolbar 缺省值为 "rfasd"
	jtbl.jdata().toolbar = "rfs"; // 没有a-添加,d-删除

如果要添加自定义按钮，可通过button_lists一一传递.
示例：添加两个自定义按钮查询“今天订单”和“所有未完成订单”。

	function getTodayOrders()
	{
		var queryParams = WUI.getQueryParam({comeTm: new Date().format("D")});
		WUI.reload(jtbl, null, queryParams);
	}
	// 显示待服务/正在服务订单
	function getTodoOrders()
	{
		var queryParams = {cond: "status=" + OrderStatus.Paid + " or status=" + OrderStatus.Started};
		WUI.reload(jtbl, null, queryParams);
	}
	var btn1 = {text: "今天订单", iconCls:'icon-search', handler: getTodayOrders};
	var btn2 = {text: "所有未完成", iconCls:'icon-search', handler: getTodoOrders};

	// 默认显示当天订单
	var queryParams = WUI.getQueryParam({comeTm: new Date().format("D")});

	var dgOpt = {
		url: WUI.makeUrl(["Ordr", "query"]),
		queryParams: queryParams,
		pageList: ...
		pageSize: ...
		// "-" 表示按钮之间加分隔符
		toolbar: WUI.dg_toolbar(jtbl, jdlg, btn1, "-", btn2),
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg)
	};
	jtbl.datagrid(dgOpt);

特别地，要添加导出数据到Excel文件的功能按钮，可以增加参数"export"作为按钮定义：

	var dgOpt = {
		...
		toolbar: WUI.dg_toolbar(jtbl, jdlg, "export", "-", btn1),
	}

如果想自行定义导出行为参数，可以参考WUI.getExportHandler
@see getExportHandler 导出按钮设置
*/
self.dg_toolbar = dg_toolbar;
function dg_toolbar(jtbl, jdlg)
{
	var toolbar = jtbl.jdata().toolbar || "rfasd";
	var btns = [];

	/*
	var org_url, org_param;

	// at this time jtbl object has not created
	setTimeout(function () {
		var jtbl_opt = jtbl.datagrid("options");
		org_url = jtbl_opt.url;
		org_param = jtbl_opt.queryParams || '';
	}, 100);
	*/

	var tb = {
		r: {text:'刷新', iconCls:'icon-reload', handler: function() { reload(jtbl); /* reload(jtbl, org_url, org_param) */ } },
		f: {text:'查询', iconCls:'icon-search', handler: function () {
			showObjDlg(jdlg, FormMode.forFind, {jtbl: jtbl});
		}},
		a: {text:'新增', iconCls:'icon-add', handler: function () {
			showObjDlg(jdlg, FormMode.forAdd, {jtbl: jtbl});
		}},
		s: {text:'修改', iconCls:'icon-edit', handler: function () {
			showObjDlg(jdlg, FormMode.forSet, {jtbl: jtbl});
		}}, 
		d: {text:'删除', iconCls:'icon-remove', handler: function () { 
			showObjDlg(jdlg, FormMode.forDel, {jtbl: jtbl});
		}},
		'export': {text: '导出', iconCls: 'icon-save', handler: getExportHandler(jtbl)}
	};
	$.each(toolbar.split(""), function(i, e) {
		if (tb[e]) {
			btns.push(tb[e]);
			btns.push("-");
		}
	});
	for (var i=2; i<arguments.length; ++i) {
		var btn = arguments[i];
		if (btn !== '-' && typeof(btn) == "string") {
			btn = tb[btn];
			mCommon.assert(btn, "toolbar button name does not support");
		}
		btns.push(btn);
	}

	return btns;
}

/**
@fn dg_dblclick(jtbl, jdlg)

@param jdlg 可以是对话框的jquery对象，或selector如"#dlgOrder".

设置双击datagrid行的回调，功能是打开相应的dialog
*/
self.dg_dblclick = function (jtbl, jdlg)
{
	return function (idx, data) {
		jtbl.datagrid("selectRow", idx);
		showObjDlg(jdlg, FormMode.forSet, {jtbl: jtbl});
	}
}

//}}}

/**
@key a[href=#page]
@key a[href=?fn]

页面中的a[href]字段会被框架特殊处理：

	<a href="#pageHome">首页</a>
	<a href="?logout">退出登录</a>

- href="#pageXXX"开头的，点击时会调用 WUI.showPage("#pageXXX");
- href="?fn"，会直接调用函数 fn();
*/
self.m_enhanceFn["a[href^=#]"] = enhanceAnchor;
function enhanceAnchor(jo)
{
	if (jo.attr("onclick"))
		return;

	jo.click(function (ev) {
		var href = $(this).attr("href");
		if (href.search(/^#(page\w+)$/) >= 0) {
			var pageName = RegExp.$1;
			WUI.showPage.call(this, pageName);
			return false;
		}
		else if (href.search(/^\?(\w+)$/) >= 0) {
			var fn = RegExp.$1;
			fn = eval(fn);
			if (fn)
				fn.call(this);
			return false;
		}
	});
}

/**
@fn getExportHandler(jtbl, ac?, param?={})

为数据表添加导出Excel菜单，如：

	jtbl.datagrid({
		url: WUI.makeUrl("User.query"),
		toolbar: WUI.dg_toolbar(jtbl, jdlg, {text:'导出', iconCls:'icon-save', handler: getExportHandler(jtbl) }),
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg)
	});

默认是导出数据表中直接来自于服务端的字段，并应用表上的查询条件及排序。
也可以通过设置param参数手工指定，如：

	handler: getExportHandler(jtbl, "User.query", {res: "id 编号, name 姓名, createTm 注册时间", orderby: "createTm DESC"})

注意：由于分页机制影响，会设置参数{pagesz: -1}以便在一页中返回所有数据，而实际一页能导出的最大数据条数取决于后端设置（默认1000，参考后端文档 AccessControl::$maxPageSz）。

@see getQueryParamFromTable 获取datagrid的当前查询参数
*/
self.getExportHandler = getExportHandler;
function getExportHandler(jtbl, ac, param)
{
	if (param == null)
		param = {};

	if (param.fmt === undefined)
		param.fmt = "excel";
	if (param.pagesz === undefined)
		param.pagesz = -1;
	if (ac == null) {
		setTimeout(function () {
			ac = jtbl.datagrid("options").url;
		});
	}

	return function () {
		var url = WUI.makeUrl(ac, getQueryParamFromTable(jtbl, param));
		window.open(url);
	}
}

/**
@fn getQueryParamFromTable(jtbl, param?)
@alias getParamFromTable

根据数据表当前设置，获取查询参数。
可能会设置{cond, orderby, res}参数。

res参数从列设置中获取，如"id 编号,name 姓名", 特别地，如果列对应字段以"_"结尾，不会加入res参数。

@see getExportHandler 导出Excel
*/
self.getQueryParamFromTable = self.getParamFromTable = getQueryParamFromTable;
function getQueryParamFromTable(jtbl, param)
{
	var opt = jtbl.datagrid("options");
	param = $.extend({}, opt.queryParams, param);
	if (param.orderby === undefined && opt.sortName) {
		param.orderby = opt.sortName;
		if (opt.sortOrder && opt.sortOrder.toLowerCase() != "asc")
			param.orderby += " " + opt.sortOrder;
	}
	if (param.res === undefined) {
		var res = '';
		$.each(opt.columns[0], function (i, e) {
			if (! e.field || e.field.substr(-1) == "_")
				return;
			if (res.length > 0)
				res += ',';
			res += e.field + " " + e.title;
			if (e.jdEnumMap) {
				res += '=' + mCommon.kvList2Str(e.jdEnumMap, ';', ':');
			}
		});
		param.res = res;
	}
	if (param.fname === undefined) {
		if (jtbl.attr("title")) {
			param.fname = jtbl.attr("title");
		}
	}
	return param;
}

var Formatter = {
	dt: function (value, row) {
		var dt = WUI.parseDate(value);
		if (dt == null)
			return value;
		return dt.format("L");
	},
	number: function (value, row) {
		return parseFloat(value);
	},
	pics: function (value, row) {
		if (value == null)
			return "(无图)";
		return value.replace(/(\d+),?/g, function (ms, picId) {
			var url = WUI.makeUrl("att", {thumbId: picId});
			return "<a target='_black' href='" + url + "'>" + picId + "</a>&nbsp;";
		});
	},
	flag: function (yes, no) {
		if (yes == null)
			yes = "是";
		if (no == null)
			no = "否";
		return function (value, row) {
			if (value == null)
				return;
			return value? yes: no;
		}
	},
	enum: function (enumMap) {
		return function (value, row) {
			if (value == null)
				return;
			return enumMap[value] || value;
		}
	},
	linkTo: function (field, dlgRef) {
		return function (value, row) {
			if (value == null)
				return;
			return self.makeLinkTo(dlgRef, row[field], value);
		}
	}
};

/**
@var formatter = {dt, number, pics, flag(yes?=是,no?=否), enum(enumMap), linkTo(field, dlgRef) }

常常应用定义Formatter变量来扩展WUI.formatter，如

	var Formatter = {
		userId: WUI.formatter.linkTo("userId", "#dlgUser"),
		orderStatus: WUI.formatter.enum({CR: "新创建", CA: "已取消"})
	};
	Formatter = $.extend(WUI.formatter, Formatter);

可用值：

- dt/number: 显示日期、数值
- pics: 显示一张或一组图片链接，点一个链接可以在新页面上显示原图片
- enum(enumMap): 根据一个map为枚举值显示描述信息，如 `enum({CR:"创建", CA:"取消"})`
- flag(yes?, no?): 显示yes-no字段，如 `flag("禁用","启用")`，也可以用enum，如`enum({0:"启用",1:"禁用"})`
- linkTo: 生成链接，点击打开对象详情对话框

在datagrid中使用：

	<th data-options="field:'createTm', sortable:true, formatter:Formatter.dt">创建时间</th>
	<th data-options="field:'amount', sortable:true, sorter: numberSort, formatter:Formatter.number">金额</th>
	<th data-options="field:'userName', sortable:true, formatter:Formatter.userId">用户</th>
	<th data-options="field:'status', sortable:true, jdEnumMap: OrderStatusMap, formatter: Formatter.orderStatus">状态</th>
	<th data-options="field:'done', sortable:true, formatter: Formatter.flag()">已处理</th>
*/
self.formatter = Formatter;

// ---- easyui setup {{{

$.extend($.fn.combobox.defaults, {
	valueField: 'val',
	textField: 'text'
});

function dgLoader(param, success, error)
{
	var jo = $(this);
	var opts = jo.datagrid("options");
	if (opts.data) {
		return defaultDgLoader.apply(this, arguments);
	}
	var param1 = {};
	for (var k in param) {
	/* TODO: enable page param in interface obj.query, disable rows/page
		if (k === "rows") {
			param1.pagesz = param[k];
		}
		else if (k === "page") {
			param1.page = param[k];
		}
	*/
		if (k === "sort") {
			param1.orderby = param.sort + " " + param.order;
		}
		else if (k === "order") {
		}
		else {
			param1[k] = param[k];
		}
	}
	self.callSvr(opts.url, param1, success);
	// TODO: 调用失败时调用error？
}

function dgLoadFilter(data)
{
	var ret = jdListToDgList(data);
	var isOnePage = (ret.total == ret.rows.length);
	// 隐藏pager: 一页能显示完且不超过5条.
	$(this).datagrid("getPager").toggle(! (isOnePage && ret.total <= 5));
	// 超过1页使用remoteSort, 否则使用localSort.
	$(this).datagrid("options").remoteSort = (! isOnePage);
	return ret;
}

function resetPageNumber(jtbl)
{
	var opt = jtbl.datagrid('options');
	if (opt.pagination && opt.pageNumber)
	{
		opt.pageNumber = 1;
		var jpager = jtbl.datagrid("getPager");
		jpager.pagination("refresh", {pageNumber: opt.pageNumber});
	}
}

var defaultDgLoader = $.fn.datagrid.defaults.loader;
$.extend($.fn.datagrid.defaults, {
// 		fit: true,
// 		width: 1200,
// 		height: 800,
// 		method: 'POST',

	rownumbers:true,
	singleSelect:true,

// 	pagination: false,
	pagination: true,
	pageSize: 20,
	pageList: [20,30,50],

	loadFilter: dgLoadFilter,
	loader: dgLoader,

	onLoadError: self.ctx.defAjaxErrProc,
	onBeforeSortColumn: function (sort, order) {
		var jtbl = $(this);
		resetPageNumber(jtbl);
	},

	// bugfix: 有时无法显示横向滚动条
	onLoadSuccess: function (data) {
		$(this).datagrid("fitColumns");
	}

	// Decided in dgLoadFilter: 超过1页使用remoteSort, 否则使用localSort.
	// remoteSort: false

// 	// 用于单选并且不清除选择, 同时取data("sel")可取到当前所选行号idx。this = grid
// 	onSelect: function (idx, data) {
// 		$(this).data("sel", idx);
// 	},
// 	onUnselect: function (idx, data) {
// 		if (idx === $(this).data("sel"))
// 			$(this).datagrid("selectRow", idx);
// 	}
});

/*
function checkIdCard(idcard)
{
	if (idcard.length != 18)
		return false;

	if (! /\d{17}[0-9x]/i.test(idcard))
		return false;

	var a = idcard.split("");
	var w = [7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2];
	var s = 0;
	for (var i=0; i<17; ++i)
	{
		s += a[i] * w[i];
	}
	var x = "10x98765432".substr(s % 11, 1);
	return x == a[17].toLowerCase();
}
*/
/**
@key .easyui-validatebox

为form中的组件加上该类，可以限制输入类型，如：

	<input name="amount" class="easyui-validatebox" data-options="required:true,validType:'number'" >

validType还支持：

- number: 数字
- uname: 4-16位用户名，字母开头
- cellphone: 11位手机号
- datetime: 格式为"年-月-日 时:分:秒"，时间部分可忽略

其它自定义规则(或改写上面规则)，可通过下列方式扩展：

	$.extend($.fn.validatebox.defaults.rules, {
		workday: {
			validator: function(value) {
				return value.match(/^[1-7,abc]+$/);
			},
			message: '格式例："1,3a,5b"表示周一,周三上午,周五下午.'
		}
	});

*/
var DefaultValidateRules = {
	number: {
		validator: function(v) {
			return v.length==0 || /^[0-9.-]+$/.test(v);
		},
		message: '必须为数字!'
	},
	/*
	workday: {
		validator: function(value) {
			return value.match(/^[1-7,abc]+$/);
		},
		message: '格式例："1,3a,5b"表示周一,周三上午,周五下午.'
	},
	idcard: {
		validator: checkIdCard,
		message: '18位身份证号有误!'
	},
	*/
	uname: {
		validator: function (v) {
			return v.length==0 || (v.length>=4 && v.length<=16 && /^[a-z]\w+$/i.test(v));
		},
		message: "4-16位英文字母或数字，以字母开头，不能出现符号."
	},
	pwd: {
		validator: function (v) {
			return v.length==0 || (v.length>=4 && v.length<=16) || v.length==32; // 32 for md5 result
		},
		message: "4-16位字母、数字或符号."
	},
	equalTo: {
		validator: function (v, param) { // param: [selector]
			return v.length==0 || v==$(param[0]).val();
		},
		message: "两次输入不一致."
	},
	cellphone: {
		validator: function (v) {
			return v.length==0 || (v.length==11 && !/\D/.test(v)); // "
		},
		message: "手机号为11位数字"
	},
	datetime: {
		validator: function (v) {
			return v.length==0 || /\d{4}-\d{1,2}-\d{1,2}( \d{1,2}:\d{1,2}(:\d{1,2})?)?/.test(v);
		},
		message: "格式为\"年-月-日 时:分:秒\"，时间部分可忽略"
	},
	usercode: {
		validator: function (v) {
			return v.length==0 || /^[a-zA-Z]/.test(v) || (v.length==11 && !/\D/.test(v)); 
		},
		message: "11位手机号或客户代码"
	}
};
$.extend($.fn.validatebox.defaults.rules, DefaultValidateRules);

// tabs自动记住上次选择
/*
$.extend($.fn.tabs.defaults, {
	onSelect: function (title) {
		var t = this.closest(".easyui-tabs");
		var stack = t.data("stack");
		if (stack === undefined) {
			stack = [];
			t.data("stack", stack);
		}
		if (title != stack[stack.length-1]) {
			var idx = stack.indexOf(title);
			if (idx >= 0) 
				stack.splice(idx, 1);
			stack.push(title);
		}
	},
	onClose: function (title) {
		var t = this.closest(".easyui-tabs");
		var stack = t.data("stack");
		var selnew = title == stack[stack.length-1];
		var idx = stack.indexOf(title);
		if (idx >= 0)
			stack.splice(idx, 1);
		if (selnew && stack.length >0) {
			// 向上找到tabs
			$(t).tabs("select", stack[stack.length-1]);
		}
	}
});
*/
// }}}

// 支持自动初始化mycombobox
self.m_enhanceFn[".my-combobox"] = function (jo) {
	jo.mycombobox();
};

function main()
{
	self.title = document.title;
	self.container = $(".wui-container");
	if (self.container.size() == 0)
		self.container = $(document.body);
	self.enhanceWithin(self.container);

	// 在muiInit事件中可以调用showPage.
	self.container.trigger("wuiInit");

// 	// 根据hash进入首页
// 	if (self.showFirstPage)
// 		showPage();
}

$(main);

}
