APPNAME:=qrlogind

CXX=clang++
CPP_SRCS := 
OBJS := 
clean_list :=

INCLUDES=-Ilibs/lightspeed/src/ -Ilibs/jsonrpcserver/
LIBPATHS=-Llibs/lightspeed -Llibs/jsonrpcserver
LIBS= -ljsonrpcserver -llightspeed -lssl -lcrypto -lpthread
LIBMAKE=libs/lightspeed/liblightspeed.a libs/jsonrpcserver/libjsonrpcserver.a


all: bin/$(APPNAME)

include $(shell find src -name .sources.mk)

ifeq "$(MAKECMDGOALS)" "debug"
	CXXFLAGS += -O0 -g3 -fPIC -Wall -Wextra -DDEBUG -D_DEBUG $(INCLUDES)
	CPPFLAGS += $(INCLUDES) 
	CFGNAME := cfg.debug
else
	CXXFLAGS += -O3 -g3 -fPIC -Wall -Wextra -DNDEBUG $(INCLUDES)
	CPPFLAGS += $(INCLUDES)
	CFGNAME := cfg.release
endif


OBJS += ${CPP_SRCS:.cpp=.o}
DEPS := ${CPP_SRCS:.cpp=.deps}
clean_list += $(OBJS)  ${DEPS} $(APPNAME) cfg.debug cfg.release


.PHONY: debug all clean compilelibs 

debug: bin/$(APPNAME) 

.INTERMEDIATE : deprun

deprun: 
	for K in $(dir $(LIBMAKE)); do $(MAKE) -C $$K deps; done 		 
	@echo "Updating dependencies..."; touch deprun;

libs/%.a: 
	$(MAKE) -C $(dir $@) $(MAKECMDGOALS) 		 


$(CFGNAME):
	@rm -f cfg.debug cfg.release
	@touch $@	
	@echo Forced rebuild for CXXFLAGS=$(CXXFLAGS)

%.deps: %.cpp deprun  
	@set -e;$(CPP) $(CPPFLAGS) -MM $*.cpp | sed -e 's~^\(.*\)\.o:~$(@D)/\1.deps $(@D)/\1.o:~' > $@

%.o: %.cpp $(CFGNAME)
	@echo $(*F).cpp  
	@$(CXX) $(CXXFLAGS) -o $@ -c $*.cpp

bin/$(APPNAME): $(OBJS) $(LIBMAKE)
	@echo "Creating executable $@ ..."		
	@mkdir -p bin
	@$(CXX) $(CXXFLAGS) -o $@ $(LIBPATHS) $(OBJS) $(LIBS) 
	
print-%  : ; @echo "$* = $($*)"

clean: 
	for K in $(dir $(LIBMAKE)); do $(MAKE) -C $$K $(MAKECMDGOALS); done 		 
	$(RM) $(clean_list)


ifneq "$(MAKECMDGOALS)" "clean"
-include ${DEPS}
endif
	
