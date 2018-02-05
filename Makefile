build:
  @make install
  @gulp
install:
  @npm install

vmeter:
  @google-chrome --load-and-launch-app=vmeter/

.PHONY: build install vmeter
