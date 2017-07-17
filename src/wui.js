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
	forAdd: 0,
	forSet: 1,
	forLink: 2,
	forFind: 3,
	forDel: 4  // 该模式实际上不会打开dlg
};

/**
@var WUI.options

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
@fn app_alert(msg, type?=i, fn?)
@param type String. "i"|"e"|"w"
@param fn Function(). 用户点击确定后的回调。

使用jQuery easyui弹出提示对话框.
*/
self.app_alert = app_alert;
function app_alert(msg, type, fn)
{
	type = type || "i";
	var icon = {i: "info", w: "warning", e: "error"}[type];
	var s = {i: "提示", w: "警告", e: "出错"}[type];
	var s1 = "<b>[" + s + "]</b>";
	$.messager.alert(self.options.title + " - " + s, s1 + " " + msg, icon, fn);

	// 查看jquery-easyui对象，发现OK按钮的class=1-btn
	setTimeout(function() {
		$(".l-btn").focus();
	}, 50);
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
@fn makeLinkTo(dlg, id, text?=id)

生成一个链接的html代码，点击该链接可以打开指定对象的对话框。

示例：根据订单号，生成一个链接，点击链接打开订单详情对话框。

	var orderId = 101;
	var html = makeLinkTo("#dlgOrder", orderId, "订单" + orderId);

*/
self.makeLinkTo = makeLinkTo;
function makeLinkTo(dlg, id, text)
{
	if (text == null)
		text = id;
	return "<a href=\"" + dlg + "\" onclick='WUI.showObjDlg(\"" + dlg + "\",FormMode.forLink,{id:" + id + "});return false'>" + text + "</a>";
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
@fn WUI.tryAutoLogin(onHandleLogin, reuseCmd?)

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
@fn WUI.handleLogin(data)
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
@fn WUI.initClient()
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
@fn WUI.setApp(opt)

@see WUI.options

TODO: remove. use $.extend instead.
*/
self.setApp = setApp;
function setApp(app)
{
	$.extend(self.options, app);
}

/**
@fn WUI.logout(dontReload?=0)
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
@fn WUI.tabClose(idx?)

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
@fn WUI.getActivePage()

返回当前激活的逻辑页jpage，注意可能为空: jpage.size()==0。
*/
self.getActivePage = getActivePage;
function getActivePage()
{
	var pp = self.tabMain.tabs('getSelected');   
	var jpage = pp.find(".wui-page");
	return jpage;
}

/**
@fn MUI.showLoading()
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
@fn MUI.hideLoading()
*/
self.hideLoading = hideLoading;
function hideLoading()
{
	$('#block').hide();
}

function mainInit()
{
/**
@var WUI.tabMain

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
}

$(mainInit);

}

// vi: foldmethod=marker
