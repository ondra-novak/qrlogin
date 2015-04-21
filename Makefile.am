
ACLOCAL_AMFLAGS = -I Build 

SUBDIRS = libs/jsonrpcserver libs/lightspeed .

noinst_PROGRAMS = qrpass



LIGHTSPEED_H = $(abs_top_srcdir)/libs/lightspeed/src
JSONRPCSERVER_H = $(abs_top_srcdir)/libs/jsonrpcserver 

qrpass: FORCE
	$(MAKE) -C Build --file makefile all "GPP=g++  -c -fno-strict-aliasing -Wall -fPIC  -I$(LIGHTSPEED_H) -I$(JSONRPCSERVER_H)" "abs_top_srcdir = $(abs_top_srcdir)"
	mkdir -p bin
	cp Build/qrpass bin/qrpass
	
clean-local: clean-src
distclean-local: clean-src
.PHONY: clean-src

clean-src:
	$(MAKE) -k -C Build --file makefile clean
	$(MAKE) -k -C libs/lightspeed clean
	$(MAKE) -k -C libs/jsonrpcserver clean
	rm -f bin/qrpass


install: qrpass
	sh install.sh

FORCE: