jdModule("jdcloud.wui", JdcloudWui);
function JdcloudWui()
{
var self = this;
var mCommon = jdModule("jdcloud.common");

// 子模块
JdcloudApp.call(self);
JdcloudCall.call(self);

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

框架会自动处理一些参数：

- g_args._debug: 在测试模式下，指定后台的调试等级，有效值为1-9. 参考：后端测试模式 P_TEST_MODE，调试等级 P_DEBUG.
- g_args.autoLogin: 记住登录信息(token)，下次自动登录；注意：如果是在手机模式下打开，此行为是默认的。示例：http://server/jdcloud/web/?autoLogin

@see parseQuery URL参数通过该函数获取。
*/
window.g_args = {}; // {_debug}

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
@var WUI.options

{appName=user, title="客户端", onShowLogin, pageHome="pageHome", pageFolder="page"}

- appName: 用于与后端通讯时标识app.
- pageHome: 首页的id, 默认为"pageHome"
- pageFolder: 子页面或对话框所在文件夹, 默认为"page"
- closeAfterAdd: (=false) 设置为true时，添加数据后关闭窗口。默认行为是添加数据后保留并清空窗口以便连续添加。
- fuzzyMatch: (=false) 设置为true时，则查询对话框中的文本查询匹配字符串任意部分。
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
	mockDelay: 50,

/**
@var WUI.options.moduleExt

用于模块扩展。有两个回调函数选项：

	// 定制模块的页面路径
	WUI.options.moduleExt.showPage = function (name) {
		// name为showPage或showDlg函数调用时的页面/对话框；返回实际页面地址；示例：
		var map = {
			"pageOrdr__Mes.html": "page/mes/pageOrdr.html",
			"pageOrdr__Mes.js": "page/mes/pageOrdr.js",
		};
		return map[name] || name;
	}
	// 定制模块的接口调用地址
	WUI.options.moduleExt.callSvr = function (name) {
		// name为callSvr调用的接口名，返回实际URL地址；示例：
		var map = {
			"Ordr__Mes.query" => "../../mes/api/Ordr.query",
			"Ordr__Item.query" => "../../mes/api/Item.query"
		}
		return map[name] || name;
	}

详细用法案例，可参考：筋斗云开发实例讲解 - 系统复用与微服务方案。
*/
	moduleExt: { showPage: $.noop, callSvr: $.noop }
};

//}}}

// set g_args
function parseArgs()
{
	if (location.search) {
		g_args = mCommon.parseQuery(location.search.substr(1));
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
	console.log("app_alert", msg);
}

// ====== login token for auto login {{{
function tokenName()
{
	var name = "token";
	if (self.options.appName)
		name += "_" + self.options.appName;
	return name;
}

self.saveLoginToken = saveLoginToken;
function saveLoginToken(data)
{
	if (data._token)
	{
		mCommon.setStorage(tokenName(), data._token);
	}
}
self.loadLoginToken = loadLoginToken;
function loadLoginToken()
{
	return mCommon.getStorage(tokenName());
}
self.deleteLoginToken = deleteLoginToken;
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

		WUI.tryAutoLogin(WUI.handleLogin, "Employee.get");
	}

	$(main);

该函数同步调用后端接口。如果要异步调用，请改用tryAutoLoginAsync函数，返回Deferred对象，resolve表示登录成功，reject表示登录失败。
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

self.tryAutoLoginAsync = tryAutoLoginAsync;
function tryAutoLoginAsync(onHandleLogin, reuseCmd)
{
	var ajaxOpt = {noex: true};
	var dfd = $.Deferred();

	function success(data) {
		if (onHandleLogin)
			onHandleLogin.call(this, data);
		dfd.resolve();
	}
	function fail() {
		dfd.reject();
		self.options.onShowLogin();
	}

	// first try "User.get"
	if (reuseCmd != null) {
		self.callSvr(reuseCmd, function (data) {
			if (data === false) {
				loginByToken()
				return;
			}
			success(data);
		}, null, ajaxOpt);
	}
	else {
		loginByToken();
	}

	// then use "login(token)"
	function loginByToken()
	{
		var token = loadLoginToken();
		if (token != null)
		{
			var postData = {token: token};
			self.callSvr("login", function (data) {
				if (data === false) {
					fail();
					return;
				}
				success(data);
			}, postData, ajaxOpt);
		}
		else {
			fail();
		}
	}
	return dfd.promise();
}

/**
@fn handleLogin(data)
@param data 调用API "login"成功后的返回数据.

处理login相关的操作, 如设置g_data.userInfo, 保存自动登录的token等等.

(v5.5) 如果URL中包含hash（即"#pageIssue"这样），且以"#page"开头，则登录后会自动打开同名的列表页（如"pageIssue"页面）。
*/
self.handleLogin = handleLogin;
function handleLogin(data)
{
	g_data.userInfo = data;
	// 自动登录: http://...?autoLogin
	if (g_args.autoLogin || /android|ipad|iphone/i.test(navigator.userAgent))
		saveLoginToken(data);

	self.showPage(self.options.pageHome);
	if (location.hash.startsWith("#page")) {
		WUI.showPage(location.hash.replace('#', ''));
	}
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
		g_data.initClient = data;
		plugins_ = data.plugins || {};
		$.each(plugins_, function (k, e) {
			if (e.js) {
				// plugin dir
				var js = BASE_URL + 'plugin/' + k + '/' + e.js;
				mCommon.loadScript(js, {async:true});
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
返回logout调用的deferred对象
*/
self.logout = logout;
function logout(dontReload)
{
	deleteLoginToken();
	g_data.userInfo = null;
	return self.callSvr("logout", function (data) {
		if (! dontReload)
			mCommon.reloadSite();
	});
}

/**
@fn showLoading()
*/
self.showLoading = showLoading;
function showLoading()
{
	console.log('loading');
}

/**
@fn hideLoading()
*/
self.hideLoading = hideLoading;
function hideLoading()
{
	console.log('hide loading');
}

}

(function () {

var mCommon = jdModule("jdcloud.common");

window.WUI = jdModule("jdcloud.wui");
$.extend(WUI, mCommon);
$.each([
	"intSort",
	"numberSort",
// 	"enterWaiting",
// 	"leaveWaiting",
// 	"makeUrl",
	"callSvr",
	"callSvrSync",
	"app_alert",
	"app_confirm",
	"app_show",
// 	"makeLinkTo",
], function () {
	window[this] = WUI[this];
});

})();

// vi: foldmethod=marker
