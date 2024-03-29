VER=1.1
NAME=jdcloud-wui
DOC=$(NAME).html
OUT=lib/$(NAME).js
OUT_MIN=lib/$(NAME).min.js
CMT="$(NAME) version $(VER)"

all: $(OUT) $(OUT_MIN) $(DOC)

clean:
	-rm -rf $(DOC) $(OUT) $(OUT_MIN)

js: $(OUT)
doc: $(DOC)

$(DOC): $(OUT)
	php tool/jdcloud-gendoc.phar $< | perl -pe 's/\bMUI\b/WUI/g' > $@

$(OUT): example/index.html src/*
	P_CMT="$(NAME) version $(VER)" perl tool/webcc_merge.pl $< > $(OUT)

$(OUT_MIN): $(OUT)
	sh -c 'tool/jsmin $(CMT) < $< > $@'

slim:
	$(MAKE) -f Makefile.slim

split:
	@perl tool/webcc_split.pl $(OUT) src
