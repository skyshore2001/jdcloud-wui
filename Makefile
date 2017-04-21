DOC=jdcloud-wui.html
OUT=jdcloud-wui.js
OUT_MIN=jdcloud-wui.min.js

all: $(OUT) $(OUT_MIN) $(DOC)

clean:
	-rm -rf $(DOC) $(OUT) $(OUT_MIN)

js: $(OUT)
doc: $(DOC)

$(DOC): $(OUT)
	jdcloud-doc $<

$(OUT): example/index.html src/*
	perl tool/webcc_merge.pl $< > $(OUT)

$(OUT_MIN): $(OUT)
	tool/jsmin < $< > $@

