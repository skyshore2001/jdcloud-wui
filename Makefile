DOC=jdcloud-wui.html
OUT=lib/jdcloud-wui.js
OUT_MIN=lib/jdcloud-wui.min.js

all: $(OUT) $(OUT_MIN) $(DOC)

clean:
	-rm -rf $(DOC) $(OUT) $(OUT_MIN)

js: $(OUT)
doc: $(DOC)

$(DOC): $(OUT)
	php tool/jdcloud-gendoc.phar $< | perl -pe 's/\bMUI\b/WUI/g' > $@

$(OUT): example/index.html src/*
	perl tool/webcc_merge.pl $< > $(OUT)

$(OUT_MIN): $(OUT)
	sh -c tool/jsmin < $< > $@

