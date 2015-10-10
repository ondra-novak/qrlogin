APPNAME:=bin/qrlogind
NEEDLIBS:=libs/lightspeed libs/jsonrpcserver  
INCLUDES:=-Ilibs/jsonrpcserver -Ilibs/lightspeed/src
LDOTHERLIBS:=-lcrypto -lssl -lpthread -lm
SOURCES=src
CXX=clang++

include building/build_app.mk