jdModule("jdcloud.wui.name", JdcloudWuiName);
function JdcloudWuiName()
{
var self = this;
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

}
