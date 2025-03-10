jdModule("jdcloud.wui", JdcloudWui);
function JdcloudWui()
{
var self = this;
var mCommon = jdModule("jdcloud.common");

// ====== global {{{
/**
@var isBusy

标识应用当前是否正在与服务端交互。一般用于自动化测试。
*/
self.isBusy = false;

/**
@var g_args 全局URL参数

应用参数。

URL参数会自动加入该对象，例如URL为 `http://{server}/{app}/index.html?orderId=10&dscr=上门洗车`，则该对象有以下值：

	g_args.orderId=10; // 注意：如果参数是个数值，则自动转为数值类型，不再是字符串。
	g_args.dscr="上门洗车"; // 对字符串会自动进行URL解码。

框架会自动处理一些参数：

- g_args._debug: 指定后台的调试等级，有效值为1-9. 而且一旦指定，后端将记录debug日志。参考：后端测试模式 P_TEST_MODE，调试等级 P_DEBUG，调试日志 P_DEBUG_LOG
- g_args.autoLogin: 记住登录信息(token)，下次自动登录；注意：如果是在手机模式下打开，此行为是默认的。示例：http://server/jdcloud/web/?autoLogin
- g_args.lang: (v7) 指定语言，默认为开发语言"dev"，支持英文"en"（加载lib/lang-en.js）。

@see parseQuery URL参数通过该函数获取。
*/
window.g_args = {};

/**
@var g_data = {userInfo?, initClient?, hasRole()}

应用全局共享数据。

在登录时，会自动设置userInfo属性为个人信息。所以可以通过 g_data.userInfo==null 来判断是否已登录。

- g_data.userInfo: 登录后，保存用户信息。
- g_data.hasRole(roleList): 检查用户是否有指定角色，如g_data.hasRole("mgr")，多个角色用逗号分隔如g_data.hasRole("mgr,业务员"). 
注意：检查权限请用WUI.canDo()函数
- g_data.initClient: 保存调用initCient接口返回的内容，用于获取后端配置项。
例如后端全局变量P_initClient中设置的选项会存入g_data.initClient中。常用于用后端配置项控制前端逻辑。

*/
window.g_data = {};

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
- closeAfterFind: (=false) (v6)设置为true时，查询后关闭窗口。默认行为是查询后窗口不关闭。
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
	// (v7: TODO: 建议使用callSvrExt['default'].makeUrl来替代，不会有重名ac)
	// 定制模块的接口调用地址
	WUI.options.moduleExt.callSvr = function (name) {
		// name为callSvr调用的接口名，返回实际URL地址；示例：
		var map = {
			"Ordr__Mes.query": "../../mes/api/Ordr.query",
			"Ordr__Item.query": "../../mes/api/Item.query"
		}
		return map[name] || name;
	}

详细用法案例，可参考：筋斗云开发实例讲解 - 系统复用与微服务方案。
*/
	moduleExt: { showPage: $.noop, callSvr: $.noop },

/**
@var WUI.options.xparam

通讯加密。默认为1（开启），在后端接口返回当前是测试模式时，会改为0（关闭）。
也可以在chrome控制台中直接修改，如MUI.options.xparam=0。

URL参数加密后在URL参数中仅保留xp={加密值}, 即使没有URL参数也会强制加上xp=1以标识开启了加密；
注意URL加密值每次会不一样，这将破坏浏览器的缓存机制，作为特例，对于以att/pic结尾的接口（如"att", "debugPic"等接口，按惯例为返回文件或图片的接口，一般支持缓存），在makeUrl/callSvc中加密时每次URL保持一致。
设置WUI.options.xparam=2也会让每次加密后的URL相同。

POST参数也将整体加密，且在contentType中会加上";xparam=1"标记。
 */
	xparam: 1,

/**
@var MUI.options.useNewThumb

带缩略图的图片编号保存风格。

- 0: 保存小图编号，用att(id)取小图，用att(thumbId)取大图
- 1: 保存大图编号，用att(id,thumb=1)取小图，用att(id)取大图
 */
	useNewThumb: 0
};

//}}}

parseArgs();
initLang();

// 子模块
JdcloudApp.call(self);
JdcloudCall.call(self);
JdcloudPage.call(self);

// set g_args
function parseArgs()
{
	if (location.search) {
		window.g_args = mCommon.parseQuery(location.search.substr(1));
	}
}

// === language {{{
/**
@var LANG 多国语言支持/翻译

系统支持通过URL参数lang指定语言，如指定英文版本：`http://myserver/myapp/web/store.html?lang=en`

如果未指定lang参数，则根据html的lang属性来确定语言，如指定英文版：

	<html lang="en">

默认为开发语言(lang="dev")，以中文为主。英文版下若想切换到开发语言，可以用`http://myserver/myapp/web/store.html?lang=dev`
g_args.lang中保存着实际使用的语言。

自带英文语言翻译文件lib/lang-en.js，当lang=en时加载它。可扩展它或以它为模板创建其它语言翻译文件。
语言翻译文件中，设置全局变量LANG，将开发语言翻译为其它语言。

系统会自动为菜单项、页面标题、列表表头标题、对话框标题等查找翻译。
其它DOM组件若想支持翻译，可手工添加CSS类lang，如:

	<div><label class="lang"><input type="checkbox" value="mgr">最高管理员</label></div>

	<a href="javascript:;" onclick="logout()" class="logout"><span class="lang"><i class="icon-exit"></i>退出系统</span></a>

或在代码中，使用WUI.enhanceLang(jo)来为DOM组件支持翻译，或直接用T(str)翻译字符串。
注意lang类或enhanceLang函数不能设置组件下子组件的文字，可先取到文字组件再设置如`WUI.enhanceLang(jo.find(".title"))`。

@fn T(s, defVal?) 字符串翻译

T函数用于将开发语言翻译为当前使用的语言。

@key .lang DOM组件支持翻译
@fn enhanceLang(jo) DOM组件支持翻译

 */
function T(s, def) {
	if (s == null || LANG == null)
		return def || s;
	var s1 = s;
	if (s.length > 2 && s.substr(-2) == "管理")
		s1 = s.substr(0, s.length-2);
	return LANG[s1] || def || s;
}

function initLang() {
	window.LANG = null;
	window.T = T;
	if (!g_args.lang)
		g_args.lang = document.documentElement.lang || 'dev';
	if (g_args.lang != 'dev') {
		mCommon.loadScript("lib/lang-" + g_args.lang + ".js", {async: false});
		mCommon.loadScript("lib/easyui/locale/easyui-lang-en.js");
	}
	else {
		mCommon.loadScript("lib/easyui/locale/easyui-lang-zh_CN.js");
	}
}

self.m_enhanceFn[".lang"] = self.enhanceLang = enhanceLang;
function enhanceLang(jo)
{
	if (LANG == null)
		return;
	jo.contents().each(function () {
		if (this.nodeType == 3) { // text
			var t = T(this.nodeValue);
			this.nodeValue = t;
		}
	});
}
// }}}

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

	// 确认框(confirm, 确定/取消)
	// 仅当点击“确定”按钮才会进入回调函数。如果想处理取消事件，可使用opt.onCancel()回调
	app_alert("立即付款?", "q", function () {
		WUI.showPage("#pay");
	});

	// 提示输入框(prompt)
	// 仅当点击“确定”按钮且输入值非空时才会进入回调函数。可使用opt.defValue指定缺省值
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
	var s = {i: T("提示"), w: T("警告"), e: T("出错")}[type] || "";
	var s1 = "<b>[" + s + "]</b>";
	jmsg = $.messager.alert(self.options.title + " - " + s, s1 + " " + msg, icon, fn);

	// 查看jquery-easyui对象，发现OK按钮的class=1-btn
	setTimeout(function() {
		var jbtn = jmsg.parent().find(".l-btn");
		jbtn.focus();
		if (alertOpt.timeoutInterval) {
			setTimeout(function() {
				try {
					jbtn.click();
				} catch (ex) {
					console.error(ex);
				}
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
	$.messager.confirm(self.options.title + " - " + T("确认"), s, fn);
}

/**
@fn app_show(msg, title?)

使用jQuery easyui弹出对话框.
*/
self.app_show = app_show;
function app_show(msg, title)
{
	$.messager.show({title: title||self.options.title, msg: msg});
}

/**
@fn app_progress(value, msg?)

@param value 0-100间数值.

显示进度条对话框. 达到100%后自动关闭.

注意：同一时刻只能显示一个进度条。
 */
self.app_progress = app_progress;
var m_isPgShow = false;
function app_progress(value, msg)
{
	value = Math.round(value);
	if (! m_isPgShow) {
		$.messager.progress({interval:0});
		m_isPgShow = true;
	}
	if (msg !== undefined) {
		$(".messager-p-msg").html(msg || '');
	}
	var bar = $.messager.progress('bar');
	bar.progressbar("setValue", value);
	if (value >= 100) {
		setTimeout(function () {
			if (m_isPgShow) {
				$.messager.progress('close');
				m_isPgShow = false;
			}
		}, 500);
	}
	/*
	var jdlg = $("#dlgProgress");
	if (jdlg.size() == 0) {
		jdlg = $('<div id="dlgProgress"><p class="easyui-progressbar"></p></div>');
	}
	if (value >= 100) {
		setTimeout(function () {
			jdlg.dialog('close');
		}, 500);
	}
	if (!jdlg.data('dialog')) {
		jdlg.dialog({title:'进度', closable:false, width: 200});
		$.parser.parse(jdlg);
	}
	else if (jdlg.dialog('options').closed) {
		jdlg.dialog('open');
	}
	var jpg = jdlg.find(".easyui-progressbar");
	jpg.progressbar("setValue", value);
	return jdlg;
	*/
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
	// initClient接口返回了userInfo，表示使用第三方认证，跳过tryAutoLogin
	if (g_data.initClient && g_data.initClient.userInfo)
		return;

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

	self.showLogin();
	return ok;
}

self.showLogin = showLogin;
function showLogin()
{
	self.options.onShowLogin();
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
		self.showLogin();
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
@fn handleLogin(userInfo)
@param userInfo 调用login/Employee.get等接口返回的用户信息数据。

处理login相关的操作, 如设置g_data.userInfo, 保存自动登录的token等等.

(v5.5) 如果URL中包含hash（即"#pageIssue"这样），且以"#page"开头，则登录后会自动打开同名的列表页（如"pageIssue"页面）。

@var dfdLogin

用于在登录完成状态下执行操作的Deferred/Promise对象。
示例：若未登录，则在登录后显示消息；若已登录则直接显示消息

	WUI.dfdLogin.then(function () {
		app_show("hello");
	});

*/
self.handleLogin = handleLogin;
self.dfdLogin = $.Deferred();
function handleLogin(data)
{
	g_data.userInfo = data;
	// 自动登录: http://...?autoLogin
	if (g_args.autoLogin || /android|ipad|iphone/i.test(navigator.userAgent))
		saveLoginToken(data);

	WUI.applyPermission();

	var jcont = $("body");
	if (WUI.isSmallScreen()) {
		$("#menu").attr("data-options", "collapsed:true");
	}
	jcont.layout();
	// bugfix: jcont.layout()会导致panel-header类被去除，再显示login页时则会多显示一个窗口头部
	$(".loginPanel > .window-header").addClass("panel-header");
	$("#menu,#main").css("visibility", "");

	$(".my-title").html(document.title);
	if (data) {
		$(".user-name").html(data.name || data.uname);
		$(".user-phone").html(data.phone);
	}

	self.dfdLogin.resolve();
	self.showPage(self.options.pageHome, self.options.pageHomeOpt);
	if (location.hash.startsWith("#page")) {
		WUI.showPage(location.hash.replace('#', ''));
	}
}
//}}}

/**
@fn initClient(param = null)

一般在进入页面时，同步地调用后端initClient接口，获取基本配置信息。
此后可通过g_data.initClient取这些配置。

若指定param参数(JS对象，如`{token: 123}`)，则作为POST参数调用initClient接口.

*/
self.initClient = initClient;
function initClient(param)
{
	self.callSvrSync('initClient', function (data) {
		g_data.initClient = data;
		Plugins.plugins_ = data.plugins || {};
		$.each(Plugins.plugins_, function (k, e) {
			if (e.js) {
				// plugin dir
				var js = BASE_URL + 'plugin/' + k + '/' + e.js;
				mCommon.loadScript(js, {async:true});
			}
		});
	}, param);
	if (g_data.initClient && g_data.initClient.userInfo) {
		WUI.handleLogin(g_data.initClient.userInfo);
		// NOTE: 会自动跳过tryAutoLogin
	}
}

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

/**
@var PageHeaderMenu

页面上方标题栏的右键菜单

扩展示例：

	WUI.PageHeaderMenu.items.push('<div id="reloadUiMeta">刷新Addon</div>');
	WUI.PageHeaderMenu.reloadUiMeta = function () {
		UiMeta.reloadUiMeta();
	}

 */
	// 标题栏右键菜单
	self.PageHeaderMenu = {
		items: [
			'<div id="mnuReload" data-options="iconCls:\'icon-reload\'">刷新页面</div>',
			'<div id="mnuReloadDlg">刷新对话框</div>',
			'<div id="mnuBatch">批量模式</div>',
			'<div id="mnuCloseTabs" data-options="iconCls:\'icon-clear\'">关闭其它页</div>',
			'<div id="mnuCloseTabs2">关闭右侧页</div>',
			'<div id="mnuFullscreen" title="Ctrl+Alt+双击">全屏</div>'
		],

		// 处理函数
		mnuReload: function () {
			self.reloadPage();
			self.reloadDialog(true);
		},
		mnuReloadDlg: function () {
			var jdlg = self.isBatchMode()? true: null;
			self.reloadDialog(jdlg);
		},
		mnuBatch: function () {
			// console.log(this);
			self.toggleBatchMode();
		},
		mnuCloseTabs: function (doCloseRight) {
			var jtabs = self.tabMain;
			var curIdx = jtabs.tabs("getTabIndex", jtabs.tabs("getSelected"));
			var arr = jtabs.tabs("tabs");
			for (var i=arr.length-1; i>curIdx; --i) {
				jtabs.tabs("close", i);
			}
			if (doCloseRight)
				return;
			// 首页不关(i=0)
			for (var i=curIdx-1; i>0; --i) {
				jtabs.tabs("close", i);
			}
		},
		mnuCloseTabs2: function () {
			self.PageHeaderMenu.mnuCloseTabs(true);
		},
		mnuFullscreen: function () {
			var jp = self.getActivePage();
			if (jp.size() > 0)
				jp[0].requestFullscreen();
		}
	};

	var jmenu = null;
	function onSpecial(ev) {
		if (jmenu == null) {
			jmenu = $('<div>' + self.PageHeaderMenu.items.join('') + '</div>');
			jmenu.menu({
				onClick: function (mnuItem) {
					self.PageHeaderMenu[mnuItem.id].call(mnuItem);
				}
			});
		}

		jmenu.menu('show', {left: ev.pageX, top: ev.pageY});
		return false;
	}
	// 连续3次点击当前tab标题，或右键点击, 弹出特别菜单, 可重新加载页面等
	self.doSpecial(self.tabMain.find(".tabs-header"), ".tabs-selected", onSpecial, 3);
	self.tabMain.find(".tabs-header").on("contextmenu", ".tabs-selected", onSpecial);

/* datagrid宽度自适应，page上似乎自动的；dialog上通过设置width:100%实现。见enhanceDialog/enhancePage
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
*/

	// 全局resize.dialog事件
	function onResizePanel() {
		//console.log("dialog resize");
		var jo = $(this);
		jo.trigger("resize.dialog");
	}
	$.fn.dialog.defaults.onResize = onResizePanel;
}

$(mainInit);

}

// vi: foldmethod=marker
