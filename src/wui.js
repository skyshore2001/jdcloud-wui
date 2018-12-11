jdModule("jdcloud.wui", JdcloudWui);
function JdcloudWui()
{
var self = this;
var mCommon = jdModule("jdcloud.common");

// 子模块
JdcloudApp.call(self);
JdcloudCall.call(self);
JdcloudPage.call(self);

// ====== global {{{
/**
@var isBusy

标识应用当前是否正在与服务端交互。一般用于自动化测试。
*/
self.isBusy = false;

/**
@var g_args

应用参数。

URL参数会自动加入该对象，例如URL为 `http://{server}/{app}/index.html?orderId=10&dscr=上门洗车`，则该对象有以下值：

	g_args.orderId=10; // 注意：如果参数是个数值，则自动转为数值类型，不再是字符串。
	g_args.dscr="上门洗车"; // 对字符串会自动进行URL解码。

此外，框架会自动加一些参数：

@var g_args._app?="user" 应用名称，由 WUI.options.appName 指定。

@see parseQuery URL参数通过该函数获取。
*/
window.g_args = {}; // {_test, _debug}

/**
@var g_data = {userInfo?}

应用全局共享数据。

在登录时，会自动设置userInfo属性为个人信息。所以可以通过 g_data.userInfo==null 来判断是否已登录。

@key g_data.userInfo

*/
window.g_data = {}; // {userInfo}

/**
@var BASE_URL

TODO: remove

设置应用的基本路径, 应以"/"结尾.

*/
window.BASE_URL = "../";

window.FormMode = {
	forAdd: 'A',
	forSet: 'S',
	forLink: 'S', // 与forSet合并，此处为兼容旧版。
	forFind: 'F',
	forDel: 'D'  // 该模式实际上不会打开dlg
};

/**
@var options

{appName=user, title="客户端", onShowLogin, pageHome="pageHome", pageFolder="page"}

- appName: 用于与后端通讯时标识app.
- pageHome: 首页的id, 默认为"pageHome"
- pageFolder: 子页面或对话框所在文件夹, 默认为"page"
*/
self.options = {
	title: "客户端",
	appName: "user",
	onShowLogin: function () { throw "NotImplemented"; },
	pageHome: "pageHome",
	pageFolder: "page",

	serverUrl: "./",

	logAction: false,
	PAGE_SZ: 20,
	manualSplash: false,
	mockDelay: 50
};

//}}}

// TODO: remove testmode
// set g_args
function parseArgs()
{
	if (location.search) {
		g_args = mCommon.parseQuery(location.search.substr(1));
		if (g_args.test || g_args._test) {
			g_args._test = 1;
			alert("测试模式!");
		}
	}
}
parseArgs();

/**
@fn app_alert(msg, [type?=i], [fn?], opt?={timeoutInterval?, defValue?, onCancel()?})
@param type 对话框类型: "i": info, 信息提示框; "e": error, 错误框; "w": warning, 警告框; "q"(与app_confirm一样): question, 确认框(会有"确定"和"取消"两个按钮); "p": prompt, 输入框
@param fn Function(text?) 回调函数，当点击确定按钮时调用。当type="p" (prompt)时参数text为用户输入的内容。
@param opt Object. 可选项。 timeoutInterval表示几秒后自动关闭对话框。defValue用于输入框(type=p)的缺省值.

使用jQuery easyui弹出提示对话框.

示例:

	// 信息框，3s后自动点确定
	app_alert("操作成功", function () {
		WUI.showPage("pageGenStat");
	}, {timeoutInterval: 3000});

	// 错误框
	app_alert("操作失败", "e");

	// 确认框(确定/取消)
	app_alert("立即付款?", "q", function () {
		WUI.showPage("#pay");
	});

	// 输入框
	app_alert("输入要查询的名字:", "p", function (text) {
		callSvr("Book.query", {cond: "name like '%" + text + "%'"});
	});

*/
self.app_alert = app_alert;
function app_alert(msg)
{
	var type = "i";
	var fn = undefined;
	var alertOpt = {};
	var jmsg;

	for (var i=1; i<arguments.length; ++i) {
		var arg = arguments[i];
		if ($.isFunction(arg)) {
			fn = arg;
		}
		else if ($.isPlainObject(arg)) {
			alertOpt = arg;
		}
		else if (typeof(arg) === "string") {
			type = arg;
		}
	}
	if (type == "q") {
		app_confirm(msg, function (isOk) {
			if (isOk) {
				fn && fn();
			}
			else if (alertOpt.onCancel) {
				alertOpt.onCancel();
			}
		});
		return;
	}
	else if (type == "p") {
		jmsg = $.messager.prompt(self.options.title, msg, function(text) {
			if (text && fn) {
				fn(text);
			}
		});
		setTimeout(function () {
			var ji = jmsg.find(".messager-input");
			ji.focus();
			if (alertOpt.defValue) {
				ji.val(alertOpt.defValue);
			}
		});
		return;
	}

	var icon = {i: "info", w: "warning", e: "error"}[type];
	var s = {i: "提示", w: "警告", e: "出错"}[type] || "";
	var s1 = "<b>[" + s + "]</b>";
	jmsg = $.messager.alert(self.options.title + " - " + s, s1 + " " + msg, icon, fn);

	// 查看jquery-easyui对象，发现OK按钮的class=1-btn
	setTimeout(function() {
		var jbtn = jmsg.find(".l-btn");
		jbtn.focus();
		if (alertOpt.timeoutInterval) {
			setTimeout(function() {
				jbtn.click();
			}, alertOpt.timeoutInterval);
		}
	});
}

/**
@fn app_confirm(msg, fn?)
@param fn Function(isOk). 用户点击确定或取消后的回调。

使用jQuery easyui弹出确认对话框.
*/
self.app_confirm = app_confirm;
function app_confirm(msg, fn)
{
	var s = "<div style='font-size:10pt'>" + msg.replace(/\n/g, "<br/>") + "</div>";
	$.messager.confirm(self.options.title + " - " + "确认", s, fn);
}

/**
@fn app_show(msg)

使用jQuery easyui弹出对话框.
*/
self.app_show = app_show;
function app_show(msg)
{
	$.messager.show({title: self.options.title, msg: msg});
}

/**
@fn makeLinkTo(dlg, id, text?=id, obj?)

生成一个链接的html代码，点击该链接可以打开指定对象的对话框。

示例：根据订单号，生成一个链接，点击链接打开订单详情对话框。

	var orderId = 101;
	var html = makeLinkTo("#dlgOrder", orderId, "订单" + orderId);

(v5.1)
示例：如果供应商(obj=Supplier)和客户(obj=Customer)共用一个对话框BizPartner，要显示一个id=101的客户，必须指定obj参数：

	var html = makeLinkTo("#dlgBizPartner", 101, "客户-101", "Customer");

点击链接将调用

	WUI.showObjDlg("#dlgBizPartner", FormMode.forSet, {id: 101, obj: "Customer"};

*/
self.makeLinkTo = makeLinkTo;
function makeLinkTo(dlg, id, text, obj)
{
	if (text == null)
		text = id;
	var optStr = obj==null? "{id:"+id+"}": "{id:"+id+",obj:\"" + obj + "\"}";
	return "<a href=\"" + dlg + "\" onclick='WUI.showObjDlg(\"" + dlg + "\",FormMode.forSet," + optStr + ");return false'>" + text + "</a>";
}

// ====== login token for auto login {{{
function tokenName()
{
	var name = "token";
	if (self.options.appName)
		name += "_" + self.options.appName;
	if (g_args._test)
		name += "_test";
	return name;
}

function saveLoginToken(data)
{
	if (data._token)
	{
		mCommon.setStorage(tokenName(), data._token);
	}
}
function loadLoginToken()
{
	return mCommon.getStorage(tokenName());
}
function deleteLoginToken()
{
	mCommon.delStorage(tokenName());
}

/**
@fn tryAutoLogin(onHandleLogin, reuseCmd?)

@param onHandleLogin Function(data). 调用后台login()成功后的回调函数(里面使用this为ajax options); 可以直接使用WUI.handleLogin
@param reuseCmd String. 当session存在时替代后台login()操作的API, 如"User.get", "Employee.get"等, 它们在已登录时返回与login相兼容的数据. 因为login操作比较重, 使用它们可减轻服务器压力. 
@return Boolean. true=登录成功; false=登录失败.

该函数一般在页面加载完成后调用，如

	function main()
	{
		$.extend(WUI.options, {
			appName: APP_NAME,
			title: APP_TITLE,
			onShowLogin: showDlgLogin
		});

		WUI.tryAutoLogin(WUI.handleLogin, "whoami");
	}

	$(main);

*/
self.tryAutoLogin = tryAutoLogin;
function tryAutoLogin(onHandleLogin, reuseCmd)
{
	var ok = false;
	var ajaxOpt = {async: false, noex: true};

	function handleAutoLogin(data)
	{
		if (data === false) // has exception (as noex=true)
			return;

		if (onHandleLogin)
			onHandleLogin.call(this, data);
		ok = true;
	}

	// first try "User.get"
	if (reuseCmd != null) {
		self.callSvr(reuseCmd, handleAutoLogin, null, ajaxOpt);
	}
	if (ok)
		return ok;

	// then use "login(token)"
	var token = loadLoginToken();
	if (token != null)
	{
		var postData = {token: token};
		self.callSvr("login", handleAutoLogin, postData, ajaxOpt);
	}
	if (ok)
		return ok;

	self.options.onShowLogin();
	return ok;
}

/**
@fn handleLogin(data)
@param data 调用API "login"成功后的返回数据.

处理login相关的操作, 如设置g_data.userInfo, 保存自动登录的token等等.

*/
self.handleLogin = handleLogin;
function handleLogin(data)
{
	g_data.userInfo = data;
	// 自动登录: http://...?autoLogin
	if (g_args.autoLogin || /android|ipad|iphone/i.test(navigator.userAgent))
		saveLoginToken(data);

	self.showPage(self.options.pageHome);
}
//}}}

// ------ plugins {{{
/**
@fn initClient()
*/
self.initClient = initClient;
var plugins_ = {};
function initClient()
{
	self.callSvrSync('initClient', function (data) {
		plugins_ = data.plugins || {};
		$.each(plugins_, function (k, e) {
			if (e.js) {
				// plugin dir
				var js = BASE_URL + 'plugin/' + k + '/' + e.js;
				mCommon.loadScript(js, null, true);
			}
		});
	});
}

/**
@class Plugins
*/
window.Plugins = {
/**
@fn Plugins.exists(pluginName)
*/
	exists: function (pname) {
		return plugins_[pname] !== undefined;
	},

/**
@fn Plugins.list()
*/
	list: function () {
		return plugins_;
	}
};
//}}}

/**
@fn setApp(opt)

@see options

TODO: remove. use $.extend instead.
*/
self.setApp = setApp;
function setApp(app)
{
	$.extend(self.options, app);
}

/**
@fn logout(dontReload?=0)
@param dontReload 如果非0, 则注销后不刷新页面.

注销当前登录, 成功后刷新页面(除非指定dontReload=1)
*/
self.logout = logout;
function logout(dontReload)
{
	deleteLoginToken();
	g_data.userInfo = null;
	self.callSvr("logout", function (data) {
		if (! dontReload)
			mCommon.reloadSite();
	});
}

/**
@fn tabClose(idx?)

关闭指定idx的标签页。如果未指定idx，则关闭当前标签页.
*/
self.tabClose = tabClose;
function tabClose(idx)
{
	if (idx == null) {
		var jtab = self.tabMain.tabs("getSelected");
		idx = self.tabMain.tabs("getTabIndex", jtab);
	}
	self.tabMain.tabs("close", idx);
}

/**
@fn getActivePage()

返回当前激活的逻辑页jpage，注意可能为空: jpage.size()==0。
*/
self.getActivePage = getActivePage;
function getActivePage()
{
	var pp = self.tabMain.tabs('getSelected');   
	if (pp == null)
		return $();
	var jpage = pp.find(".wui-page");
	return jpage;
}

/**
@fn showLoading()
*/
self.showLoading = showLoading;
function showLoading()
{
	$('#block').css({
		width: $(document).width(),
		height: $(document).height(),
		'z-index': 999999
	}).show();
}

/**
@fn hideLoading()
*/
self.hideLoading = hideLoading;
function hideLoading()
{
	$('#block').hide();
}

function mainInit()
{
/**
@var tabMain

标签页组件。为jquery-easyui的tabs插件，可以参考easyui文档调用相关命令进行操作，如关闭当前Tab：

	var jtab = WUI.tabMain.tabs("getSelected");
	var idx = WUI.tabMain.tabs("getTabIndex", jtab);
	WUI.tabMain.tabs("close", idx);

注：要关闭当前Tab，可以直接用WUI.tabClose().
*/
	self.tabMain = $('#my-tabMain');   
	// TODO: auto container
	mCommon.assert(self.tabMain.size()==1, "require #my-tabMain as container");

	var opt = self.tabMain.tabs('options');
	$.extend(opt, {
		onSelect: function (title) {
			var jpage = getActivePage();
			if (jpage.size() == 0)
				return;
			jpage.trigger('pageshow');
		},
		onBeforeClose: function (title) {
			var jpage = getActivePage();
			if (jpage.size() == 0)
				return;
			jpage.trigger('pagedestroy');
		}
	});

	// 连续5次点击当前tab标题，重新加载页面
	self.doSpecial(self.tabMain.find(".tabs-header"), ".tabs-selected", function () {
		self.reloadPage();
		self.reloadDialog(true);
	});

	// bugfix for datagrid size after resizing
	var tmr;
	$(window).on("resize", function () {
		if (tmr)
			clearTimeout(tmr);
		tmr = setTimeout(function () {
			tmr = null;
			console.log("panel resize");
			var jpage = getActivePage();
			// 强制datagrid重排
			jpage.closest(".panel-body").panel("doLayout", true);
		}, 200);
	});

	// 调整对话框上的datagrid大小
	function onResizePanel() {
		//console.log("dialog resize");
		// 强制datagrid重排
		$(this).closest(".panel-body").panel("doLayout", true);
	}
	$.fn.dialog.defaults.onResize = onResizePanel;
}

$(mainInit);

}

// vi: foldmethod=marker
