/**
@var myReporter

如果suite中第一个case或标记了g_data.critical=true的case失败，则忽略整个suite中其它case;
如果第一个suite失败，则中止执行。

初始化：

	it ("critical case", function () {
		this.critical = true;
		// 一旦失败则取消suite中其它case执行
		// suite中第一个case自动设置为critical
	});

*/
var myReporter = {
	suiteStarted: function (result, suite) {
		this.specNo_ = 0;
	},
	suiteDone: function (result, suite) {
		if (++this.suiteNo_ == 1 && result.status != "finished")
			jasmine.getEnv().pend();
	},

	specStarted: function (result, spec) {
		if (++ this.specNo_ == 1)
			spec.context.critical = true;
	},
	specDone: function (result, spec) {
		if (spec.context.critical && result.status == "failed") {
			spec.suite.pend();
		}
	},

	specNo_: 0,
	suiteNo_: 0,
};

jasmine.getEnv().addReporter(myReporter);
jasmine.getEnv().throwOnExpectationFailure(true);
