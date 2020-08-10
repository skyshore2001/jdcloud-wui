function JdcloudPage()
{
var self = this;
// 模块内共享
self.ctx = self.ctx || {};

var mCommon = jdModule("jdcloud.common");
var m_batchMode = false; // 批量操作模式, 按住Ctrl键。

self.toggleBatchMode = toggleBatchMode;
function toggleBatchMode(val) {
	if (val !== undefined)
		m_batchMode = val;
	else
		m_batchMode = !m_batchMode;
	app_alert("批量模式: " + (m_batchMode?"ON":"OFF"));
	// 标题栏显示红色. 在style.css中设置#my-tabMain.batchMode.
	self.tabMain.toggleClass("batchMode", m_batchMode);

	// 允许点击多选
	var opt = WUI.getActivePage().find(".datagrid-f").datagrid("options");
	opt.ctrlSelect = !m_batchMode;
	$.fn.datagrid.defaults.singleSelect = false;
	$.fn.datagrid.defaults.ctrlSelect = !m_batchMode;
}

mCommon.assert($.fn.combobox, "require jquery-easyui lib.");

self.getRow = getRow;
function getRow(jtbl, silent)
{
	var row = jtbl.datagrid('getSelected');
	if (! row && ! silent)
	{
		self.app_alert("请先选择一行。", "w");
		return null;
	}
	return row;
}

function isTreegrid(jtbl)
{
	return !! jtbl.data().treegrid;
}

/** 
@fn reload(jtbl, url?, queryParams?) 
*/
self.reload = reload;
function reload(jtbl, url, queryParams)
{
	var datagrid = isTreegrid(jtbl)? "treegrid": "datagrid";
	if (url != null || queryParams != null) {
		var opt = jtbl[datagrid]("options");
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
	jtbl[datagrid]('reload');
	jtbl[datagrid]('clearSelections');
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

/*
jdListToDgList处理后的数据格式：

	{total:10, rows:[
		{id:1, name, fatherId: null},
		{id:2, name, fatherId: 1},
		...
	]}

为适合treegrid显示，应为子结点添加_parentId字段：

	{total:10, rows:[
		{id:1, ...}
		{id:2, ..., _parentId:1},
		...
	]}

easyui-treegrid会将其再转成层次结构：

	{total:10, rows:[
		{id:1, ..., children: [
			{id:2, ...},
		]}
		...
	]}

特别地，为了查询结果能正常显示（排除展开结点操作的查询，其它查询的树表是残缺不全的），当发现数据有fatherId但父结点不在列表中时，不去设置_parentId，避免该行无法显示。
*/
function jdListToTree(data, fatherField, parentId, isLeaf)
{
	var data1 = jdListToDgList(data)

	var idMap = {};
	$.each(data1.rows, function (i, e) {
		idMap[e.id] = true;
	});
	$.each(data1.rows, function (i, e) {
		var fatherId = e[fatherField];
		// parentId存在表示异步查询子结点, 应设置_parentId字段.
		if (fatherId && (idMap[fatherId] || parentId)) {
			e._parentId = fatherId;
		}
		if (isLeaf && !isLeaf(e)) {
			e.state = 'closed'; // 如果无结点, 则其展开时将触发ajax查询子结点
		}
	})
	return data1;
}

/** 
@fn reloadRow(jtbl, rowData?)

@param rowData must be the original data from table row

rowData如果未指定，则使用当前选择的行。
 */
self.reloadRow = reloadRow;
function reloadRow(jtbl, rowData)
{
	var datagrid = isTreegrid(jtbl)? "treegrid": "datagrid";
	if (rowData == null) {
		rowData = jtbl[datagrid]('getSelected');
		if (rowData == null)
			return;
	}
	jtbl[datagrid]("loading");
	var opt = jtbl[datagrid]("options");
	self.callSvr(opt.url, api_queryOne, {cond: "id=" + rowData.id});

	function api_queryOne(data) 
	{
		jtbl[datagrid]("loaded");
		var idx = jtbl[datagrid]("getRowIndex", rowData);
		var objArr = jdListToArray(data);
		if (datagrid == "treegrid") {
			$.extend(rowData, objArr[0]);
			if (rowData["_parentId"] && rowData["_parentId"] != rowData["fatherId"]) {
				rowData["_parentId"] = rowData["fatherId"];
				jtbl.treegrid("remove", rowData.id);
				jtbl.treegrid("append", {
					parent: rowData["_parentId"],
					data: [rowData]
				});
			}
			else {
				jtbl.treegrid("update", {id: rowData.id, row: rowData});
			}
			return;
		}
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
	var datagrid = isTreegrid(jtbl)? "treegrid": "datagrid";
	jtbl[datagrid]("loading");
	var opt = jtbl[datagrid]("options");
	self.callSvr(opt.url, api_queryOne, {cond: "id=" + id});

	function api_queryOne(data)
	{
		jtbl[datagrid]("loaded");
		var objArr = jdListToArray(data);
		if (objArr.length != 1)
			return;
		var row = objArr[0];
		if (datagrid == "treegrid") {
			jtbl.treegrid('append',{
				parent: row["fatherId"],
				data: [row]
			});
			return;
		}
		if (opt.sortOrder == "desc")
			jtbl.datagrid("insertRow", {index:0, row: row});
		else
			jtbl.datagrid("appendRow", row);
	}
}

function tabid(title)
{
	return "pg_" + title.replace(/[ ()\[\]\/\\,<>.!@#$%^&*-+]+/g, "_");
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
 		try {
			initfn.apply(jo, paramArr || []);
		} catch (ex) {
			console.error(ex);
			throw(ex);
		}
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
	WUI.showPage("pageHome", "我的首页"); // 默认标题是"首页"，这里指定显示标题为"我的首页"。

(v5.4) 如果标题中含有"%s"，将替换成原始标题，同时传参到initPage:

	WUI.showPage("pageHome", "%s-" + cityName, [{cityName: cityName}]); //e.g. 显示 "首页-上海"

title用于唯一标识tab，即如果相同title的tab存在则直接切换过去。除非：
(v5.5) 如果标题以"!"结尾, 则每次都打开新的tab页。
*/
self.showPage = showPage;
function showPage(pageName, title, paramArr)
{
	var showPageArgs_ = arguments;
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
		var title0 = jpage.attr("title") || "无标题";
		if (title == null)
			title = title0;
		else
			title = title.replace('%s', title0);

		var force = false;
		if (title.substr(-1, 1) == "!") {
			force = true;
			title = title.substr(0, title.length-1);
		}

		var tt = self.tabMain;
		if (tt.tabs('exists', title)) {
			if (!force) {
				tt.tabs('select', title);
				return;
			}
			tt.tabs('close', title);
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
		jpageNew.attr("title", title);

		$.parser.parse(jpageNew); // easyui enhancement
		enhanceGrid(jpageNew);
		self.enhanceWithin(jpageNew);
		callInitfn(jpageNew, paramArr);

		jpageNew.data("showPageArgs_", showPageArgs_); // used by WUI.reloadPage
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

// 对于页面中只有一个datagrid的情况，铺满显示，且工具栏置顶。
function enhanceGrid(jpage)
{
	var o = jpage[0].firstElementChild;
	if (o && o.tagName == "TABLE" && jpage[0].children.length == 1) {
		if (o.style.height == "" || o.style.height == "auto")
			o.style.height = "100%";
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
		else if ((e.ctrlKey||e.metaKey) && e.which == 70)
		{
			showObjDlg($(this), FormMode.forFind, $(this).data("objParam"));
			return false;
		}
/* // Ctrl-A: add mode
		else if ((e.ctrlKey||e.metaKey) && e.which == 65)
		{
			showObjDlg($(this), FormMode.forAdd, null);
			return false;
		}
*/
	});
}

/**
@fn isSmallScreen

判断是否为手机小屏显示. 宽度低于640当作小屏处理.
*/
self.isSmallScreen = isSmallScreen;
function isSmallScreen() {
	return $(document.body).width() < 640;
}
if (isSmallScreen()) {
	$('<meta name="viewport" content="width=device-width, initial-scale=0.8, maximum-scale=0.8">').appendTo(document.head);
}

/**
@fn showDlg(jdlg, opt?)

@param jdlg 可以是jquery对象，也可以是selector字符串或DOM对象，比如 "#dlgOrder".
注意：当对话框动态从外部加载时，jdlg=$("#dlgOrder") 一开始会为空数组，这时也可以调用该函数，且调用后jdlg会被修改为实际加载的对话框对象。

@param opt?={url, buttons, noCancel=false, okLabel="确定", cancelLabel="取消", modal=true, reset=true, validate=true, data, onOk, onSubmit, title}

- opt.url: String. 点击确定后，提交到后台的URL。如果设置则自动提交数据，否则应在opt.onOk回调或validate事件中手动提交。
- opt.buttons: Object数组。用于添加“确定”、“取消”按钮以外的其它按钮，如`[{text: '下一步', iconCls:'icon-ok', handler: btnNext_click}]`。
 用opt.okLabel/cancelLabel可修改“确定”、“取消”按钮的名字，用opt.noCancel=true可不要“取消”按钮。
- opt.modal: Boolean.模态对话框，这时不可操作对话框外其它部分，如登录框等。设置为false改为非模态对话框。
- opt.data: Object. 自动加载的数据, 将自动填充到对话框上带name属性的DOM上。在修改对象时，仅当与opt.data有差异的数据才会传到服务端。
- opt.reset: Boolean. 显示对话框前先清空。
- opt.validate: Boolean. 是否提交前用easyui-form组件验证数据。内部使用。
- opt.onSubmit: Function(data) 自动提交前回调。用于验证或补齐提交数据，返回false可取消提交。opt.url为空时不回调。
- opt.onOk: Function(jdlg, data?) 如果自动提交(opt.url非空)，则服务端接口返回数据后回调，data为返回数据。如果是手动提交，则点确定按钮时回调，没有data参数。
- opt.title: String. 如果指定，则更新对话框标题。
- opt.dialogOpt: 底层jquery-easyui dialog选项。参考http://www.jeasyui.net/plugins/159.html

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

示例：显示一个对话框

	WUI.showDlg("#dlgReportCond", {modal:false, reset:false});

默认为模态框，指定modal:false使它成为非模态；
默认每次打开都清空数据，指定reset:false使它保留状态。

**对象型对话框与formMode**

函数showObjDlg()会调用本函数显示对话框，称为对象型对话框，用于对象增删改查，它将以下操作集中在一起。
打开窗口时，会设置窗口模式(formMode):

- 查询(FormMode.forFind)
- 显示及更新(FormMode.forSet)
- 添加(FormMode.forAdd)
- 删除(FormMode.forDel)，但实际上不会打开对话框

注意：

- 可通过`var formMode = jdlg.jdata().mode;`来获取当前对话框模式。
- 非对象型对话框的formMode为空。
- 对象型对话框由框架自动设置各opt选项，一般不应自行修改opt，而是通过处理对话框事件实现逻辑。

初始数据与对话框中带name属性的对象相关联，显示对话框时，带name属性的DOM对象将使用数据opt.data自动赋值(对话框show事件中可修改)，在点“确定”按钮提交时将改动的数据发到服务端(validate事件中可修改)，详见
@see setFormData,getFormData

**对话框事件**

操作对话框时会发出以下事件供回调：

	beforeshow - 对话框显示前。常用来处理对话框显示参数opt或初始数据opt.data.
	show - 显示对话框后。常用来设置字段值或样式，隐藏字段、初始化子表datagrid或隐藏子表列等。
	validate - 用于提交前验证、补齐数据等。返回false可取消提交。(v5.2) 支持其中有异步操作.
	retdata - 服务端返回结果时触发。用来根据服务器返回数据继续处理，如再次调用接口。

注意：

- 旧版本中的initdata, loaddata, savedata将废弃，应分别改用beforeshow, show, validate事件替代，注意事件参数及检查对话框模式。

@key event-beforeshow(ev, formMode, opt)
显示对话框前触发。

- opt参数即showDlg的opt参数，可在此处修改，例如修改opt.title可以设置对话框标题。
- opt.objParam参数是由showObjDlg传入给dialog的参数，比如opt.objParam.obj, opt.objParam.formMode等。
- 通过修改opt.data可为字段设置缺省值。注意forFind模式下opt.data为空。
- 可以通过在beforeshow中用setTimeout延迟执行某些动作，这与在show事件中回调操作效果基本一样。

注意：每次调用showDlg()都会回调，可能这时对话框已经在显示。

@key event-show(ev, formMode, initData)
对话框显示后事件，用于设置DOM组件。
注意如果在beforeshow事件中设置DOM，对于带name属性的组件会在加载数据时值被覆盖回去，对它们在beforeshow中只能通过设置opt.data来指定缺省值。

@key event-validate(ev, formMode, initData, newData)
initData为初始数据，如果要验证或修改待提交数据，应直接检查form中相应DOM元素的值。如果需要增加待提交字段，可加到newData中去。示例：添加参数: newData.mystatus='CR';

(v5.2) validate事件支持返回Deferred对象支持异步操作.
示例: 在提交前先弹出对话框询问. 由于app_alert是异步对话框, 需要将一个Deferred对象放入ev.dfds数组, 告诉框架等待ev.dfds中的延迟对象都resolve后再继续执行.

	jdlg.on("validate", onValidate);
	function onValidate(ev, mode, oriData, newData) 
	{
		var dfd = $.Deferred();
		app_alert("确认?", "q", function () {
			console.log("OK!");
			dfd.resolve();
		});
		ev.dfds.push(dfd.promise());
	}

常用于在validate中异步调用接口(比如上传文件).

@key event-retdata(ev, data, formMode)
form提交后事件，用于处理返回数据

以下事件将废弃：
@key event-initdata(ev, initData, formMode) 加载数据前触发。可修改要加载的数据initData, 用于为字段设置缺省值。将废弃，改用beforeshow事件。
@key event-loaddata(ev, initData, formMode) form加载数据后，一般用于将服务端数据转为界面显示数据。将废弃，改用show事件。
@key event-savedata(ev, formMode, initData) 对于设置了opt.url的窗口，将向后台提交数据，提交前将触发该事件，用于验证或补足数据（修正某个）将界面数据转为提交数据. 返回false或调用ev.preventDefault()可阻止form提交。将废弃，改用validate事件。

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

**控制底层jquery-easyui对话框**

示例：关闭对话框时回调事件：

	var dialogOpt = {  
		onClose:function(){
			console.log("close");
		}  
	};

	jfrm.on("beforeshow",function(ev, formMode, opt) {
		opt.dialogOpt = dialogOpt;
	})

**复用dialog模板**
(v5.3)

如 dlgUDT__A 与 dlgUDT__B 共用dlgUDT对话框模板，只要用"__"分隔对话框模板文件和后缀名。

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
	callInitfn(jdlg, [opt]);

	// TODO: 事件换成jdlg触发，不用jfrm。目前旧应用仍使用jfrm监听事件，暂应保持兼容。
	var jfrm = jdlg.is("form")? jdlg: jdlg.find("form:first");
	var formMode = jdlg.jdata().mode;
	jfrm.trigger("beforeshow", [formMode, opt]);

	var btns = [{text: opt.okLabel, iconCls:'icon-ok', handler: fnOk}];
	if (! opt.noCancel) 
		btns.push({text: opt.cancelLabel, iconCls:'icon-cancel', handler: fnCancel})
	if ($.isArray(opt.buttons))
		btns.push.apply(btns, opt.buttons);

	var small = self.isSmallScreen();
	var dlgOpt = $.extend({
//		minimizable: true,
		maximizable: !small,
		collapsible: !small,
		resizable: !small,

		// reset default pos.
		left: null,
		top: null,

		closable: ! opt.noCancel,
		modal: opt.modal,
		buttons: btns,
		title: opt.title
	}, opt.dialogOpt);
	if (jdlg.is(":visible")) {
		dlgOpt0 = jdlg.dialog("options");
		$.extend(dlgOpt, {
			left: dlgOpt0.left,
			top: dlgOpt0.top
		});
	}
	jdlg.dialog(dlgOpt);
	var perm = jdlg.attr("wui-perm") || jdlg.dialog("options").title;
	jdlg.toggleClass("wui-readonly", (opt.objParam && opt.objParam.readonly) || !self.canDo(perm, "对话框"));

	jdlg.okCancel(fnOk, opt.noCancel? undefined: fnCancel);

	if (opt.reset)
	{
		mCommon.setFormData(jdlg); // reset
		// !!! NOTE: form.reset does not reset hidden items, which causes data is not cleared for find mode !!!
		// jdlg.find("[type=hidden]:not([noReset])").val(""); // setFormData可将hidden清除。
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

	// 含有固定值的对话框，根据opt.objParam[fieldName]填充值并设置只读.
	setFixedFields(jdlg, opt);

// 	openDlg(jdlg);
	focusDlg(jdlg);
	jfrm.trigger("show", [formMode, opt.data]);

	function fnCancel() {closeDlg(jdlg)}
	function fnOk()
	{
		if (jdlg.hasClass("wui-readonly") && formMode!=FormMode.forFind) { // css("pointer-events") == "none"
			closeDlg(jdlg);
			return;
		}
		var ret = opt.validate? jfrm.form("validate"): true;
		if (! ret)
			return false;

		var newData = {};
		var dfd = self.triggerAsync(jfrm, "validate", [formMode, opt.data, newData]);
		if (dfd === false)
			return false;
		dfd.then(afterValidate);

		function afterValidate() {
			// TODO: remove. 用validate事件替代。
			var ev = $.Event("savedata");
			jfrm.trigger(ev, [formMode, opt.data]);
			if (ev.isDefaultPrevented())
				return false;

			var data = mCommon.getFormData(jdlg);
			$.extend(data, newData);
			if (opt.url) {
				if (opt.onSubmit && opt.onSubmit(data) === false)
					return false;

				var m = opt.url.action.match(/\.(add|set|del)$/);
				if (m) {
					var cmd = {add: "新增", set: "修改", del: "删除"}[m[1]];
					if (!self.canDo(perm, cmd)) {
						app_alert("无权限操作! 本操作需要权限：" + perm + "." + cmd, "w");
						throw "abort";
					}
				}
				// 批量更新
				if (formMode==FormMode.forSet && opt.url.action && /.set$/.test(opt.url.action)) {
					var jtbl = jdlg.jdata().jtbl;
					var obj = opt.url.action.replace(".set", "");
					var rv = batchOp(obj, "setIf", jtbl, data, function () {
						// TODO: onCrud();
						closeDlg(jdlg);
					});
					if (rv !== false)
						return;
				}
				self.callSvr(opt.url, success, data);
			}
			else {
				success(data);
			}
			// opt.onAfterSubmit && opt.onAfterSubmit(jfrm); // REMOVED
		}

		function success (data)
		{
			if (data != null && opt.onOk) {
				jfrm.trigger('retdata', [data, formMode]);
				opt.onOk.call(jdlg, data);
			}
		}
	}
}

// 按住Ctrl/Command键进入批量模式。
var tmrBatch_;
$(document).keydown(function (e) {
	if (e.ctrlKey || e.metaKey) {
		m_batchMode = true;
		clearTimeout(tmrBatch_);
		tmrBatch_ = setTimeout(function () {
			m_batchMode = false;
			tmrBatch_ = null;
		},500);
	}
});
$(window).keyup(function (e) {
	if (e.ctrlKey || e.metaKey) {
		m_batchMode = false;
		clearTimeout(tmrBatch_);
	}
});

/**
@fn batchOp(obj, ac, jtbl, data/dataFn, onBatchDone?, forceFlag?)

@param ac "setIf"/"delIf"
@param data/dataFn 批量操作的参数。
可以是一个函数dataFn(batchCnt)，参数batchCnt为当前批量操作的记录数。
该函数返回data或一个Deferred对象(该对象适时应调用dfd.resolve(data)做批量操作)。dataFn返回false表示不做后续处理。

批量操作支持两种方式: 

1. 基于多选: 按Ctrl/Shift在表上多选，然后点删除或更新，批量操作选中行；
2. 基于条件: 按住Ctrl键点删除或更新，批量操作过滤条件下的所有行

函数返回false表示当前非批量处理模式，不予处理。

@param forceFlag 强制批量操作。
默认仅当多选或按住Ctrl键才认为是批量操作；
如果值为1，表示无须按Ctrl键，即如果有多选，就用多选；如果没有多选，则使用当前的过滤条件；
如果值为2，表示只基于选择项操作，即使只选了一项也对其操作。但如果没有选任何行，则使用过滤条件。

示例：批量更新附件到行记录上, 在onBatch中返回一个Deferred对象，并在获得数据后调用dfd.resolve(data)

	var forceFlag = 1; // 如果没有多选，则按当前过滤条件全部更新。
	WUI.batchOp("Task", "setIf", jtbl, onBatch, function () {
		WUI.closeDlg(jdlg);
	}, forceFlag);

	function onBatch(batchCnt)
	{
		if (batchCnt == 0) {
			app_alert("没有记录更新。");
			return false;
		}
		var dfd = $.Deferred();
		app_alert("批量上传附件到" + batchCnt + "行记录?", "q", function () {
			var dfd1 = triggerAsync(jdlg.find(".wui-upload"), "submit"); // 异步上传文件，返回Deferred对象
			dfd1.then(function () {
				var data = WUI.getFormData(jfrm);
				dfd.resolve(data);
			});
		});
		return dfd.promise();
	}

@see triggerAsync 异步事件调用

上面函数中处理异步调用链，不易理解，可以简单理解为：

	if (confirm("确认操作?") == no)
		return;
	jupload.submit();
	return getFormData(jfrm);

*/
self.batchOp = batchOp;
function batchOp(obj, ac, jtbl, data, onBatchDone, forceFlag)
{
	if (obj == null || jtbl == null)
		return false;
	var selArr =  jtbl.datagrid("getChecked");
	if (!forceFlag && ! (m_batchMode || selArr.length > 1)) {
		return false;
	}

	var acName;
	if (ac == "setIf") {
		acName = "批量更新";
	}
	else if (ac == "delIf") {
		acName = "批量删除";
	}
	else {
		return;
	}
	var queryParams;
	var doBatchOnSel = selArr.length > 1 && selArr[0].id != null;
	// forceFlag=2时，一行也批量操作
	if (!doBatchOnSel && forceFlag === 2 && selArr.length == 1 && selArr[0].id != null)
		doBatchOnSel = true;
	// 多选，cond为`id IN (...)`
	if (doBatchOnSel) {
		var idList = $.map(selArr, function (e) { return e.id}).join(',');
		queryParams = {cond: "t0.id IN (" + idList + ")"};
		confirmBatch(selArr.length);
	}
	else {
		var dgOpt = jtbl.datagrid("options");
		var p1 = dgOpt.url && dgOpt.url.params;
		var p2 = dgOpt.queryParams;
		queryParams = $.extend({}, p1, p2);
		if (!queryParams.cond)
			queryParams.cond = "t0.id>0"; // 避免后台因无条件而报错
		var p3 = $.extend({}, queryParams, {res: "count(*) cnt"});
		self.callSvr(obj + ".query", p3, function (data1) {
			confirmBatch(data1.d[0][0]);
		});
	}
	return;
	
	function confirmBatch(batchCnt) {
		console.log(obj + "." + ac + ": " + JSON.stringify(queryParams));
		if (!$.isFunction(data)) {
			app_confirm(acName + batchCnt + "条记录？", function (b) {
				if (!b)
					return;
				doBatch(data);
			});
		}
		else {
			var dataFn = data;
			data = dataFn(batchCnt);
			if (data == false)
				return;
			$.when(data).then(doBatch);
		}
	}

	function doBatch(data) {
		if (ac == "setIf" && $.isEmptyObject(data)) {
			app_alert("没有需要更新的内容。");
			return;
		}
		self.callSvr(obj+"."+ac, queryParams, function (cnt) {
			onBatchDone && onBatchDone();
			reload(jtbl);
			app_alert(acName + cnt + "条记录");
		}, data);
	}
}

/*
如果objParam中指定了值，则字段只读，并且在forAdd模式下填充值。
如果objParam中未指定值，则不限制该字段，可自由设置或修改。
*/
function setFixedFields(jdlg, beforeShowOpt) {
	self.formItems(jdlg.find(".wui-fixedField"), function (ji, name, it) {
		var fixedVal = beforeShowOpt && beforeShowOpt.objParam && beforeShowOpt.objParam[name];
		if (fixedVal || fixedVal == '') {
			it.setReadonly(ji, true);
			var forAdd = beforeShowOpt.objParam.mode == FormMode.forAdd;
			if (forAdd) {
				it.setValue(ji, fixedVal);
			}
		}
		else {
			it.setReadonly(ji, false);
		}
	});
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
	var showPageArgs = self.getActivePage().data("showPageArgs_");
	self.unloadPage();
	self.showPage.apply(this, showPageArgs);
}

/**
@fn unloadDialog(all?=false)
@alias reloadDialog

删除当前激活的对话框。一般用于开发过程，在修改外部对话框后，调用该函数清除以便此后再载入页面，可以看到更新的内容。

	WUI.reloadDialog();
	WUI.reloadDialog(true); // 重置所有外部加载的对话框(v5.1)

注意：

- 对于内部对话框调用本函数无意义。直接关闭对话框即可。
- 由于不知道打开对话框的参数，reloadDialog无法重新打开对话框，因而它的行为与unloadDialog一样。
*/
self.unloadDialog = unloadDialog;
self.reloadDialog = unloadDialog;
function unloadDialog(all)
{
	var jdlg = all? $(".wui-dialog[wui-pageFile]"): getTopDialog();
	if (jdlg.size() == 0)
		return;
	try { closeDlg(jdlg); } catch (ex) { console.log(ex); }

	// 是内部对话框，不做删除处理
	if (jdlg.attr("wui-pageFile") == null)
		return;
	var dlgId = jdlg.attr("id");
	try { jdlg.dialog("destroy"); } catch (ex) { console.log(ex); }
	jdlg.remove();
	$("style[wui-origin=" + dlgId + "]").remove();
	return jdlg;
}

/**
@fn canDo(topic, cmd=null, defaultVal=true)

权限检查回调，支持以下场景：

1. 页面上的操作（按钮）

	canDo(页面标题, 按钮标题, true);// 返回false则不显示该按钮

2. 对话框上的操作

	canDo(对话框标题, "对话框", true); // 返回false表示对话框只读

TODO:通过设置 WUI.options.canDo(topic, cmd) 可扩展定制权限。
TODO: 链接的对话框有安全问题

默认情况下，所有菜单不显示，其它操作均允许。
如果指定了"*"权限，则显示所有菜单。
如果指定了"不可XX"权限，则topic或cmd匹配XX则不允许。

- topic: 通过菜单、页面、对话框、按钮的wui-perm属性指定（按钮参考dg_toolbar函数），如果未指定，则取其text.
- cmd: 对话框，新增，修改，删除，导出，自定义的按钮

示例：假设有菜单结构如下（不包含最高管理员专有的“系统设置”）

	主数据管理
		企业
		用户

	运营管理
		活动
		公告
		积分商城

只显示“公告”菜单项：

	公告

只显示“运营管理”菜单组：

	运营管理

显示除了“运营管理”外的所有内容：

	* 不可运营管理

其中`*`表示显示所有菜单项。
显示所有内容（与管理员权限相同），但只能查看不可操作

	* 只读

“只读”权限排除了“新增”、“修改”等操作。
特别地，“只读”权限也不允许“导出”操作（虽然导出是读操作，但一般要求较高权限），假如要允许导出公告，可以设置：

	* 只读 公告.导出

显示“运营管理”，在列表页中不显示“删除”、“导出”按钮：

	运营管理 不可删除 不可导出

显示“运营管理”，在列表页中，不显示“删除”、“导出”按钮，但“公告”中显示“删除”按钮：

	运营管理 不可删除 不可导出 公告.删除

或等价于：

	运营管理 不可导出 活动.不可删除 积分商城.不可删除

显示“运营管理”和“主数据管理”菜单组，但“主数据管理”下面内容均是只读的：

	运营管理 主数据管理 企业.只读 用户.只读

 */
self.canDo = canDo;
function canDo(topic, cmd, defaultVal)
{
//	console.log('canDo: ', topic, cmd);
	if (!g_data.permSet)
		return true;
	self.assert(topic);

	if (defaultVal === undefined)
		defaultVal = true;
	if (cmd == null) {
		var rv = g_data.permSet[topic];
		if (rv !== undefined)
			return rv;
		return defaultVal;
	}

	var rv = g_data.permSet[topic + "." + cmd];
	if (rv !== undefined)
		return rv;

	rv = g_data.permSet[cmd];
	if (rv !== undefined)
		return rv;

	rv = g_data.permSet[topic + ".只读"];
	if (rv === undefined)
		rv = g_data.permSet["只读"];
	if (rv && (cmd == "新增" || cmd == "修改" || cmd == "删除" || cmd == "导出" || cmd == "对话框")) {
		return false;
	}

	rv = g_data.permSet[topic];
	if (rv !== undefined)
		return rv;
	
	return defaultVal;
//	return self.options.canDo(topic, cmd);
}

// ---- object CRUD {{{
var BTN_TEXT = ["添加", "保存", "保存", "查找", "删除"];
// e.g. var text = BTN_TEXT[mode];

function getFindData(jfrm)
{
	var kvList = {};
	var kvList2 = {};
	self.formItems(jfrm, function (ji, name, it) {
		if (ji.hasClass("notForFind"))
			return;
		var v = it.getValue(ji);
		if (v == null || v === "")
			return;
		if (ji.hasClass("wui-notCond"))
			kvList2[name] = v;
		else
			kvList[name] = v;
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
	// 支持dialog复用，dlgId格式为"{模板id}__{后缀名}"。如 dlgUDT__A 与 dlgUDT__B 共用dlgUDT对话框模板。
	var arr = dlgId.split("__");
	var tplName = arr[0];
	var sel = "#tpl_" + tplName;
	var html = $(sel).html();
	if (html) {
		loadDialogTpl(html, dlgId, pageFile);
		return true;
	}

	var pageFile = getModulePath(tplName + ".html");
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
		var jo = $(html).filter("div,form");
		if (jo.size() > 1 || jo.size() == 0) {
			console.log("!!! Warning: bad format for dialog '" + dlgId + "'. Element count = " + jo.size());
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
		jdlg.addClass('wui-dialog');

		$.parser.parse(jdlg); // easyui enhancement
		jdlg.find(">table:first, form>table:first").has(":input").addClass("wui-form-table");
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
			// bugfix: 第1次点击对象链接时(showObjDlg动态加载对话框), 如果出错(如id不存在), 系统报错但遮罩层未清, 导致无法继续操作.
			// 原因是, 在ajax回调中再调用*同步*ajax操作且失败(这时$.active=2), 在dataFilter中会$.active减1, 然后强制用app_abort退出, 导致$.active清0, 从而在leaveWaiting时无法hideLoading
			// 解决方案: 在ajax回调处理中, 为防止后面调用同步ajax出错, 使用setTimeout让第一个调用先结束.
			setTimeout(onLoad);
		}
	}
	return true;
}

/**
@fn doFind(jo, jtbl?, appendFilter?=false)

根据对话框中jo部分内容查询，结果显示到表格(jtbl)中。
jo一般为对话框内的form或td，也可以为dialog自身。
查询时，取jo内部带name属性的字段作为查询条件。如果有多个字段，则生成AND条件。

如果查询条件为空，则不做查询；但如果指定jtbl的话，则强制查询。

jtbl未指定时，自动取对话框关联的表格；如果未关联，则不做查询。
appendFilter=true时，表示追加过滤条件。

@see .wui-notCond 指定独立查询条件
 */
self.doFind = doFind;
function doFind(jo, jtbl, appendFilter)
{
	var force = (jtbl!=null);
	if (!jtbl) {
		var jdlg = jo.closest(".wui-dialog");
		if (jdlg.size() > 0)
			jtbl = jdlg.jdata().jtbl;
	}
	if (!jtbl || jtbl.size() == 0) {
		console.warn("doFind: no table");
		return;
	}

	var param = getFindData(jo);
	if (!force && $.isEmptyObject(param)) {
		console.warn("doFind: no param");
		return;
	}

	// 归并table上的cond条件. dgOpt.url是makeUrl生成的，保存了原始的params
	// 避免url和queryParams中同名cond条件被覆盖，因而用AND合并。
	var dgOpt = jtbl.datagrid("options");
	if (!appendFilter || $.isEmptyObject(dgOpt.queryParams)) { // 设置过滤条件
		if (param.cond && dgOpt && dgOpt.url && dgOpt.url.params && dgOpt.url.params.cond) {
			param.cond = dgOpt.url.params.cond + " AND (" + param.cond + ")";
		}
	}
	else { // 追加过滤条件
		if (dgOpt.queryParams.cond)
			dgOpt.queryParams.cond += " AND (" + param.cond + ")";
		$.extend(param, dgOpt.queryParams);
	}
	reload(jtbl, undefined, param);
}

/**
@fn showObjDlg(jdlg, mode, opt?={jtbl, id, obj})

@param jdlg 可以是jquery对象，也可以是selector字符串或DOM对象，比如 "#dlgOrder". 注意：当对话框保存为单独模块时，jdlg=$("#dlgOrder") 一开始会为空数组，这时也可以调用该函数，且调用后jdlg会被修改为实际加载的对话框对象。

@param opt.id String. mode=link时必设，set/del如缺省则从关联的opt.jtbl中取, add/find时不需要
@param opt.jtbl Datagrid. dialog/form关联的datagrid -- 如果dlg对应多个tbl, 必须每次打开都设置
@param opt.obj String. (v5.1) 对象对话框的对象名，如果未指定，则从my-obj属性获取。通过该参数可动态指定对象名。
@param opt.offline Boolean. (v5.1) 不与后台交互。
@param opt.title String. (v5.1) 指定对话框标题。
@param opt.readonly String. (v5.5) 指定对话框只读。即设置wui-readonly类。

@key objParam 对象对话框的初始参数。

(v5.1)
此外，通过设置jdlg.objParam，具有和设置opt参数一样的功能，常在initPageXXX中使用，因为在page中不直接调用showObjDlg.
示例：

	var jdlg = $("#dlgSupplier");
	jdlg.objParam = {type: "C", obj: "Customer"};
	showObjDlg(jdlg, FormMode.forSet, {id:101});
	// 等价于 showObjDlg(jdlg, FormMode.forSet, {id:101, obj: "Customer", type: "C"});

在dialog的事件beforeshow(ev, formMode, opt)中，可以通过opt.objParam取出showObjDlg传入的所有参数opt。
(v5.3) 可在对象对话框的初始化函数中使用 initDlgXXX(opt)，注意：非对象对话框初始化函数的opt参数与此不同。

@param opt.onCrud Function(). (v5.1) 对话框操作完成时回调。
一般用于点击表格上的增删改查工具按钮完成操作时插入逻辑。
在回调函数中this对象就是objParam，可通过this.mode获取操作类型。示例：

	jdlg1.objParam = {
		offline: true,
		onCrud: function () {
			if (this.mode == FormMode.forDel) {
				// after delete row
			}
			// ... 重新计算金额
			// ... 刷新关联的表格行
			// opt.objParam.reloadRow();
		}
	};
	jtbl.datagrid({
		toolbar: WUI.dg_toolbar(jtbl, jdlg1), // 添加增删改查工具按钮，点击则调用showObjDlg，这时objParam生效。
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg1),
		...
	});

在dialog逻辑中使用objParam:

	function initDlgXXX() {
		// ...
		jdlg.on("beforeshow", onBeforeShow);
		
		function onBeforeShow(ev, formMode, opt) {
			var objParam = opt.objParam; // {id, mode, jtbl?, offline?...}
		}
	}

@param opt.reloadRow() 可用于刷新本对话框关联的表格行数据

事件参考：
@see showDlg
*/
self.showObjDlg = showObjDlg;
function showObjDlg(jdlg, mode, opt)
{
	opt = $.extend({mode: mode}, jdlg.objParam, opt);
	if (jdlg.constructor != jQuery)
		jdlg = $(jdlg);
	else
		jdlg.data("objParam", jdlg.objParam);
	if (loadDialog(jdlg, onLoad))
		return;
	function onLoad() {
		showObjDlg(jdlg, mode, opt);
	}

	callInitfn(jdlg, [opt]);
	if (opt.jtbl) {
		jdlg.jdata().jtbl = opt.jtbl;
	}
	var id = opt.id;

// 一些参数保存在jdlg.jdata(), 
// mode: 上次的mode
// 以下参数试图分别从jdlg.jdata()和jtbl.jdata()上取. 当一个dlg对应多个tbl时，应存储在jtbl上。
// init_data: 用于add时初始化的数据 
// url_param: 除id外，用于拼url的参数
	var obj = opt.obj || jdlg.attr("my-obj");
	mCommon.assert(obj);
	var jd = jdlg.jdata();
	var jd2 = jd.jtbl && jd.jtbl.jdata();

	// get id
	var rowData;
	if (id == null) {
		if (mode == FormMode.forSet || mode == FormMode.forDel) // get dialog data from jtbl row, 必须关联jtbl
		{
			mCommon.assert(jd.jtbl);

			// 批量删除
			if (mode == FormMode.forDel) {
				var rv = batchOp(obj, "delIf", jd.jtbl, null, onCrud);
				if (rv !== false)
					return;
			}

			rowData = getRow(jd.jtbl);
			if (rowData == null)
				return;
			id = rowData.id;
		}
	}

	var url;
	if (mode == FormMode.forAdd) {
		if (! opt.offline)
			url = self.makeUrl([obj, "add"], jd.url_param);
//		if (jd.jtbl) 
//			jd.jtbl.datagrid("clearSelections");
	}
	else if (mode == FormMode.forSet) {
		if (! opt.offline)
			url = self.makeUrl([obj, "set"], {id: id});
	}
	else if (mode == FormMode.forDel) {
		if (opt.offline) {
			if (jd.jtbl) {
				var rowIndex = jd.jtbl.datagrid("getRowIndex", rowData);
				jd.jtbl.datagrid("deleteRow", rowIndex);
				onCrud();
			}
			return;
		}

		self.app_confirm("确定要删除一条记录?", function (b) {
			if (! b)
				return;

			var ac = obj + ".del";
			self.callSvr(ac, {id: id}, function(data) {
				if (jd.jtbl)
					reload(jd.jtbl);
				self.app_show('删除成功!');
				onCrud();
			});
		});
		return;
	}

	// TODO: 直接用jdlg
	var jfrm = jdlg.is("form")? jdlg: jdlg.find("form:first");
	
	// 设置find模式
	var doReset = ! (jd.mode == FormMode.forFind && mode == FormMode.forFind) // 一直是find, 则不清除
	if (mode == FormMode.forFind && jd.mode != FormMode.forFind) {
		jfrm.find(":input[name], .textbox-text").each (function (i,e) {
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
			else if (je.is("[type=hidden]")) {
			}
			else {
				je.prop("disabled", false);
				je.addClass("wui-find-field");
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
		jfrm.find(":input[name], .textbox-text").each (function (i,e) {
			var je = $(e);
			var bak = je.jdata().bak;
			if (bak == null)
				return;
			je.prop("disabled", bak.disabled);
			je.removeClass("wui-find-field");
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
		load_data = $.extend({}, init_data);
		// 添加时尝试设置父结点
		if (jd.jtbl && isTreegrid(jd.jtbl) && (rowData=getRow(jd.jtbl, true))) {
			// 在展开的结点上点添加，默认添加子结点；否则添加兄弟结点
			if (rowData.state == "open") {
				load_data["fatherId"] = rowData.id;
				//load_data["level"] = rowData.level+1;
			}
			else {
				load_data["fatherId"] = rowData["fatherId"];
				//load_data["level"] = rowData["level"];
			}
		}
	}
	else if (mode == FormMode.forSet) {
		if (rowData) {
			load_data = $.extend({}, rowData);
		}
		else {
			var load_url = self.makeUrl([obj, 'get'], {id: id});
			var data = self.callSvrSync(load_url);
			if (data == null)
				return;
			load_data = data;
		}
	}
	// objParam.reloadRow()
	opt.reloadRow = function () {
		if (mode == FormMode.forSet && opt.jtbl && rowData)
			self.reloadRow(opt.jtbl, rowData);
	};
	// open the dialog
	showDlg(jdlg, {
		url: url,
		title: opt.title,
		okLabel: BTN_TEXT[mode],
		validate: mode!=FormMode.forFind,
		modal: false,  // mode == FormMode.forAdd || mode == FormMode.forSet
		reset: doReset,
		data: load_data,
		onSubmit: onSubmit,
		onOk: onOk,
		objParam: opt
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
		var jtbl = jd.jtbl;
		if (mode==FormMode.forFind) {
			mCommon.assert(jtbl); // 查询结果显示到jtbl中
			doFind(jfrm, jtbl);
			onCrud();
			return;
		}
		// add/set/link
		// TODO: add option to force reload all (for set/add)
		if (jtbl) {
			if (opt.offline) {
				if (mode == FormMode.forSet && rowData) {
					var idx = jtbl.datagrid("getRowIndex", rowData);
					$.extend(rowData, retData);
					jtbl.datagrid("refreshRow", idx);
				}
				else if (mode == FormMode.forAdd) {
					jtbl.datagrid("appendRow", retData);
				}
			}
			else {
				if (mode == FormMode.forSet && rowData)
					reloadRow(jtbl, rowData);
				else if (mode == FormMode.forAdd) {
					appendRow(jtbl, retData);
				}
				else
					reload(jtbl);
			}
		}
		if (mode == FormMode.forAdd && !self.options.closeAfterAdd)
		{
			showObjDlg(jdlg, mode); // reset and add another
		}
		else
		{
			closeDlg(jdlg);
		}
		if (!opt.offline)
			self.app_show('操作成功!');
		onCrud();
	}

	function onCrud() {
		if (obj && !opt.offline) {
			console.log("refresh: " + obj);
			$(".my-combobox").trigger("markRefresh", obj);
		}
		opt.onCrud && opt.onCrud();
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
导入可以用"import", 快速查询可以用"qsearch" (这两个以扩展方式在jdcloud-wui-ext.js中定义):

	var dgOpt = {
		...
		toolbar: WUI.dg_toolbar(jtbl, jdlg, "import", "export", "-", btn1, btn2, "qsearch"),
	}

如果想自行定义导出行为参数，可以参考WUI.getExportHandler
@see getExportHandler 导出按钮设置

按钮的权限（即是否显示）取决于wui-perm和text属性。优先使用wui-perm。系统内置的常用的有："新增", "修改", "删除", "导出"
下面例子，把“导入”特别设置为内置的权限“新增”，这样不仅不必在角色管理中设置，且设置了“只读”等权限也可自动隐藏它。

	var btnImport = {text: "导入", "wui-perm": "新增", iconCls:'icon-ok', handler: function () {
		DlgImport.show({obj: "Ordr"}, function () {
			WUI.reload(jtbl);
		});
	}};

支持定义扩展，比如importOrdr:

	// ctx = {jtbl, jpage, jdlg} // 注意jdlg在调用时可能尚未初始化，可以访问 jdlg.selector和jdlg.objParam等。
	dg_toolbar.importOrdr = function (ctx) {
		return {text: "导入", "wui-perm": "新增", iconCls:'icon-ok', handler: function () {
			DlgImport.show({obj: "Ordr"}, function () {
				WUI.reload(jtbl);
			});
		}}
	};

这时就可以直接这样来指定导入按钮（便于全局重用）：

	WUI.dg_toolbar(jtbl, jdlg, ..., "importOrdr")
	
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

	var btnSpecArr = toolbar.split("");
	for (var i=2; i<arguments.length; ++i) {
		btnSpecArr.push(arguments[i]);
	}

	// TODO: dialog上的button未考虑
	var jpage = jtbl.closest(".wui-page");
	var perm = jpage.attr("wui-perm") || jpage.attr("title");
	var ctx = {jpage: jpage, jtbl: jtbl, jdlg: jdlg};
	for (var i=0; i<btnSpecArr.length; ++i) {
		var btn = btnSpecArr[i];
		if (! btn)
			continue;
		if (btn !== '-' && typeof(btn) == "string") {
			var btnfn = dg_toolbar[btn];
			mCommon.assert(btnfn, "toolbar button `" + btn + "` does not support");
			btn = btnfn(ctx);
		}
		if (btn.text != "-" && perm && !self.canDo(perm, btn["wui-perm"] || btn.text)) {
			continue;
		}
		btns.push(btn);
	}

	return btns;
}

$.extend(dg_toolbar, {
	r: function (ctx) {
		return {text:'刷新', iconCls:'icon-reload', handler: function() {
			reload(ctx.jtbl, null, m_batchMode?{}:null);
		}} // Ctrl-点击，清空查询条件后查询。
	},
	f: function (ctx) {
		return {text:'查询', iconCls:'icon-search', handler: function () {
			showObjDlg(ctx.jdlg, FormMode.forFind, {jtbl: ctx.jtbl});
		}}
	},
	a: function (ctx) {
		return {text:'新增', iconCls:'icon-add', handler: function () {
			showObjDlg(ctx.jdlg, FormMode.forAdd, {jtbl: ctx.jtbl});
		}}
	},
	s: function (ctx) {
		return {text:'修改', iconCls:'icon-edit', handler: function () {
			showObjDlg(ctx.jdlg, FormMode.forSet, {jtbl: ctx.jtbl});
		}}
	},
	d: function (ctx) {
		return {text:'删除', iconCls:'icon-remove', handler: function () {
			showObjDlg(ctx.jdlg, FormMode.forDel, {jtbl: ctx.jtbl});
		}}
	},
	'export': function (ctx) {
		return {text: '导出', iconCls: 'icon-save', handler: getExportHandler(ctx.jtbl)}
	}
});

/**
@fn dg_dblclick(jtbl, jdlg)

@param jdlg 可以是对话框的jquery对象，或selector如"#dlgOrder".

设置双击datagrid行的回调，功能是打开相应的dialog
*/
self.dg_dblclick = function (jtbl, jdlg)
{
	return function (idx, data) {
//		jtbl.datagrid("selectRow", idx);
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
self.m_enhanceFn["a[href^='#']"] = enhanceAnchor;
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
		toolbar: WUI.dg_toolbar(jtbl, jdlg, {text:'导出', iconCls:'icon-save', handler: WUI.getExportHandler(jtbl) }),
		onDblClickRow: WUI.dg_dblclick(jtbl, jdlg)
	});

默认是导出数据表中直接来自于服务端的字段，并应用表上的查询条件及排序。
也可以通过设置param参数手工指定，如：

	handler: WUI.getExportHandler(jtbl, "User.query", {res: "id 编号, name 姓名, createTm 注册时间", orderby: "createTm DESC"})

注意：由于分页机制影响，会设置参数{pagesz: -1}以便在一页中返回所有数据，而实际一页能导出的最大数据条数取决于后端设置（默认1000，参考后端文档 AccessControl::$maxPageSz）。

会根据datagrid当前设置，自动为query接口添加res(输出字段), cond(查询条件), fname(导出文件名), orderby(排序条件)参数。

若是已有url，希望从datagrid获取cond, fname等参数，而不要覆盖res参数，可以这样做：

	var url = WUI.makeUrl("PdiRecord.query", ...); // makeUrl生成的url具有params属性，为原始查询参数
	var btnExport = {text:'导出', iconCls:'icon-save', handler: WUI.getExportHandler(jtbl, null, {res: url.params.res || null}) };

@see getQueryParamFromTable 获取datagrid的当前查询参数
*/
self.getExportHandler = getExportHandler;
function getExportHandler(jtbl, ac, param)
{
	param = $.extend({}, {
		fmt: "excel",
		pagesz: -1
	}, param);

	return function () {
		if (ac == null) {
			if (jtbl.size() == 0 || !jtbl.hasClass("datagrid-f"))
				throw "error: bad datagrid: \"" + jtbl.selector + "\"";
			ac = jtbl.datagrid("options").url;
		}
		var p1 = getQueryParamFromTable(jtbl, param);
		var debugShow = false;
		if (m_batchMode) {
			var fmt = prompt("输入导出格式: excel csv txt excelcsv html (以!结尾为调试输出)", p1.fmt);
			if (!fmt)
				return;
			if (fmt.substr(-1) == "!") {
				fmt = fmt.substr(0, fmt.length-1);
				debugShow = true;
			}
			p1.fmt = fmt;
		}

		var url = WUI.makeUrl(ac, p1);
		// !!! 调试导出的方法：在控制台中设置  window.open=$.get 即可查看请求响应过程。
		console.log("export: " + url);
		console.log("(HINT: debug via Ctrl-Export OR window.open=$.get)");
		if (debugShow) {
			$.get(url);
			return;
		}
		window.open(url);
	}
}

/**
@fn getQueryParamFromTable(jtbl, param?)
@alias getParamFromTable

根据数据表当前设置，获取查询参数。
可能会设置{cond, orderby, res, fname}参数。

res参数从列设置中获取，如"id 编号,name 姓名", 特别地，如果列对应字段以"_"结尾，不会加入res参数。

(v5.2)
如果表上有多选行，则导出条件为cond="t0.id IN (id1, id2)"这种形式。

fname自动根据当前页面的title以及datagrid当前的queryParam自动拼接生成。
如title是"检测记录报表", queryParam为"tm>='2020-1-1' and tm<='2020-7-1"，则生成文件名fname="检测记录报表-2020-1-1-2020-7-1".

@see getExportHandler 导出Excel
*/
self.getQueryParamFromTable = self.getParamFromTable = getQueryParamFromTable;
function getQueryParamFromTable(jtbl, param)
{
	var opt = jtbl.datagrid("options");

	param = $.extend({}, opt.queryParams, param);
	var selArr =  jtbl.datagrid("getChecked");
	if (selArr.length > 1 && selArr[0].id != null) {
		var idList = $.map(selArr, function (e) { return e.id}).join(',');
		param.cond = "t0.id IN (" + idList + ")";
	}
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
			res += e.field + " \"" + e.title + "\"";
			if (e.jdEnumMap) {
				res += '=' + mCommon.kvList2Str(e.jdEnumMap, ';', ':');
			}
		});
		param.res = res;
	}
	if (param.fname === undefined) {
		param.fname = jtbl.prop("title") || jtbl.closest(".wui-page").prop("title");
		if (opt.queryParams && opt.queryParams.cond) {
			var keys = [];
			opt.queryParams.cond.replace(/'([^']+?)'/g, function (ms, ms1) {
				keys.push(ms1);
			});
			if (keys.length > 0) {
				param.fname += "-" + keys.join("-");
			}
		}
	}
	return param;
}

window.YesNoMap = {
	0: "否",
	1: "是"
};

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
	atts: function (value, row) {
		if (value == null)
			return "(无)";
		return value.toString().replace(/(\d+)(?::([^,]+))?,?/g, function (ms, attId, name) {
			var url = WUI.makeUrl("att", {id: attId});
			if (name == null)
				name = attId;
			return "<a target='_black' href='" + url + "'>" + name + "</a>&nbsp;";
		});
	},
	pics1: function (value, row) {
		if (value == null)
			return "(无图)";
		return '<a target="_black" href="' + WUI.makeUrl("pic", {id:value}) + '">' + value + '</a>';
	},
	pics: function (value, row) {
		if (value == null)
			return "(无图)";
		var maxN = Formatter.pics.maxCnt || 3; // 最多显示图片数
		// value = value + "," + value + "," + value;
		value1 = value.toString().replace(/(\d+)(?::([^,]+))?,?/g, function (ms, picId, name) {
			if (name == null)
				name = "图" + picId;
			if (maxN <= 0)
				return name + " ";
			-- maxN;
			var url = WUI.makeUrl("att", {id: picId});
			return '<img alt="' + name + '" src="' + url + '">';
		});
		var linkUrl = WUI.makeUrl("pic", {id:value});
		return '<a target="_black" href="' + linkUrl + '">' + value1 + '</a>';
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
	enum: function (enumMap, sep) {
		sep = sep || ',';
		return function (value, row) {
			if (value == null)
				return;
			var v = enumMap[value];
			if (v != null)
				return v;
			if (value.indexOf && value.indexOf(sep) > 0) {
				var v1 = $.map(value.split(sep), function(e) {
					return enumMap[e] || e;
				});
				v = v1.join(sep);
			}
			else {
				v = value;
			}
			return v;
		}
	},
	enumStyler: function (colorMap) {
		return function (value, row) {
			var color = colorMap[value];
			if (Color[color])
				color = Color[color];
			if (color)
				return "background-color: " + color;
		}
	},
	// showField=false: 显示value
	// showField=true: 显示"{id}-{name}"
	// 否则显示指定字段
	linkTo: function (field, dlgRef, showField) {
		return function (value, row) {
			if (value == null)
				return;
			var val = typeof(showField)=="string"? row[showField]:
				showField? (row[field] + "-" + value): value;
			return self.makeLinkTo(dlgRef, row[field], val);
		}
	}
};

/**
@var formatter = {dt, number, pics, flag(yes?=是,no?=否), enum(enumMap), linkTo(field, dlgRef, showId?=false) }

常常应用定义Formatter变量来扩展WUI.formatter，如

	var Formatter = {
		userId: WUI.formatter.linkTo("userId", "#dlgUser"), // 显示用户名(value)，点击后打开用户明细框
		storeId: WUI.formatter.linkTo("storeId", "#dlgStore", true), // 显示"商户id-商户名", 点击后打开商户明细框
		orderStatus: WUI.formatter.enum({CR: "新创建", CA: "已取消"}) // 将CR,CA这样的值转换为显示文字。
	};
	Formatter = $.extend(WUI.formatter, Formatter);

可用值：

- dt/number: 显示日期、数值
- pics/pics1: 显示一张或一组图片链接，点一个链接可以在新页面上显示原图片。(v5.4) pics直接显示图片(最多3张，可通过Formatter.pics.maxCnt设置)，更直观；pics1只显示图片编号，效率更好。
- atts: (v5.4) 显示一个或一组附件，点链接可下载附件。
- enum(enumMap): 根据一个map为枚举值显示描述信息，如 `enum({CR:"创建", CA:"取消"})`。
 (v5.1) 也支持枚举值列表，如设置为 `enumList({emp:"员工", mgr:"经理"})`，则会将"emp"和"emp,mgr"分别解析为"员工", "员工,经理"
- flag(yes?, no?): 显示yes-no字段，如 `flag("禁用","启用")`，也可以用enum，如`enum({0:"启用",1:"禁用"})`
- linkTo: 生成链接，点击打开对象详情对话框

在datagrid中使用：

	<th data-options="field:'createTm', sortable:true, formatter:Formatter.dt">创建时间</th>
	<th data-options="field:'amount', sortable:true, sorter: numberSort, formatter:Formatter.number">金额</th>
	<th data-options="field:'userName', sortable:true, formatter:Formatter.linkTo('userId', '#dlgUser')">用户</th>
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
	if (opts.url == null)
		return false;
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
	//singleSelect:true,
	ctrlSelect: true, // 默认是单选，按ctrl或shift支持多选

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

	onLoadSuccess: function (data) {
		if (data.total) {
			// bugfix: 有时无法显示横向滚动条
			$(this).datagrid("fitColumns");
		}
		else {
/**
@key .noData

CSS类, 可定义无数据提示的样式
 */
			// 提示"无数据". 在sytle.css中定义noData类
			var body = $(this).data().datagrid.dc.body2;
			var view =  $(this).data().datagrid.dc.view;
			var h = 50;
			view.height(view.height() - body.height() + h);
			body.height(h);
			body.find('table tbody').empty().append('<tr><td width="' + body.width() + 'px" height="50px" align="center" class="noData" style="border:none; color:#ccc; font-size:14px">没有数据</td></tr>');
		}
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

$.extend($.fn.treegrid.defaults, {
	idField: "id",
	treeField: "id",
	pagination: false,
	loadFilter: function (data, parentId) {
		var isLeaf = $(this).treegrid("options").isLeaf;
		var ret = jdListToTree(data, "fatherId", parentId, isLeaf);
		return ret;
	},
	onBeforeLoad: function (row, param) {
		if (row) { // row非空表示展开父结点操作，须将param改为 {cond?, id} => {cond:"fatherId=1"}
			param.cond = "fatherId=" + row.id;
			delete param["id"];
		}
	}
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
/**
@key .wui-form-table

在wui-dialog上，对于form下直接放置的table，一般用于字段列表排列，框架对它添加类wui-form-table并自动对列设置百分比宽度，以自适应显示。

在非对话框上，也可手工添加此类来应用该功能。

 */
self.m_enhanceFn[".wui-form-table"] = enhanceTableLayout;
function enhanceTableLayout(jo) {
	var tbl = jo[0];
	if (tbl.rows.length == 0)
		return;
	var tr = tbl.rows[0];
	var colCnt = tr.cells.length;
	var doAddTr = false;
	// 考虑有colspan的情况
	for (var j=0; j<tr.cells.length; ++j) {
		var td = tr.cells[j];
		if (td.getAttribute("colspan") != null) {
			colCnt += parseInt(td.getAttribute("colspan"))-1;
			doAddTr = true;
		}
	}
	var rates = {
		2: ["10%", "90%"],
		4: ["10%", "40%", "10%", "40%"],
		6: ["5%", "25%", "5%", "25%", "5%", "25%"]
	};
	if (!rates[colCnt])
		return;
	// 如果首行有colspan，则添加隐藏行定宽
	if (doAddTr) {
		var td = dup("<td></td>", colCnt);
		$('<tr class="wui-form-table-tr-width" style="visibility:hidden">' + td + '</tr>').prependTo(jo);
		tr = tbl.rows[0];
	}
	for (var i=0; i<colCnt; ++i) {
		var je = $(tr.cells[i]);
		if (je.attr("width") == null)
			je.attr("width", rates[colCnt][i]);
	}

	/*
	2s内三击字段标题，触发查询。Ctrl+三击为追加过滤条件
	 */
	self.doSpecial(jo, 'td', function (ev) {
		var jo = $(this).next();
		if (jo.find("[name]").size() > 0) {
			var appendFilter = (ev.ctrlKey || ev.metaKey);
			doFind(jo, null, appendFilter);
		}
	}, 3, 2);

	function dup(s, n) {
		var ret = '';
		for (var i=0; i<n; ++i) {
			ret += s;
		}
		return ret;
	}
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
