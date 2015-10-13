# settings
#
# LIBNAME - name of lib without prefix and suffix (LIBNAME=xxx will generate libxxx.a)
# LIBINCLUDES - relative path to the includes exported by this library
# CONFIG - optional name of configuration file. You can define rule to create this file
# NEEDLIBS - list of libraries (path to lib root) that is needed by this library. They need to  
#             implement same make-interface and generate ldeps.mk 
# DONTREBUILDLIBS - if "1", force rebuild will not rebuild depend libraries
#
# goals
#
# all - build all release
# debug - build debug version
# deps - build only dependencies and library dependencies
# force-rebuild - requests rebuild, next all or debug will rebuild
#
# outputs
#
# lib$(LIBNAME).a - file contains the library
# $(LIBNAME).ldeps -library dependence file - just include this to the target makefile to add this library to the project
 

LIBFULLNAME:=$(patsubst %,lib%.a,$(LIBNAME))
LIBDEPS:=libdeps.mk

TARGETFILE=$(LIBFULLNAME)
PROGRESSPREFIX=$(LIBNAME)

include  $(dir $(lastword $(MAKEFILE_LIST)))/common.mk

deps: ${LIBDEPS}

.ONESHELL: $(LIBDEPS) $(LIBFULLNAME)

define genlibdeps
	set -e;\
	echo "$(LIBNAME): Updating library dependencies... ";\
	(\
		echo "LDFLAGS+=-L$$PWD";\
		echo "LDLIBS:=-l$(LIBNAME) \$$(LDLIBS)";\
		echo "LIBPATHS+=$$PWD/$(LIBFULLNAME)";\
		echo "INCLUDES+= -I$$PWD/$(LIBINCLUDES)" ;\
		echo -n "$$PWD/$(LIBFULLNAME) : " ;\
		PWD=`pwd`;find $$PWD "(" -name "*.h" -or -name "*.tcc" ")" -and -printf "\\\\\\n\\t%p" ;\
		for K in $(abspath $(CPP_SRCS)); do echo -n "\\\\\\n\\t $$K"; done;\
		echo " \$$(CFGNAME)";\
		echo -n "\\t@flock $$PWD -c \"\$$(MAKE) -C $$PWD \$$(MAKECMDGOALS)\" \\n" ;\
		echo "$$PWD/$(LIBFULLNAME).clean :";\
		echo -n "\\t@flock $$PWD -c \"\$$(MAKE) -C $$PWD clean\" \\n" ;\
	) > $(LIBDEPS) 
endef

$(LIBDEPS): $(CONFIG)
	@$(genlibdeps)

$(LIBFULLNAME): $(OBJS) $(LIBDEPS)
	@$(genlibdeps)
	@echo "$(LIBNAME): Creating library ..."		
	@$(AR) -r $@ $(OBJS)
	@touch tmp/stamp
	
clean: 
	@echo $(LIBNAME): cleaning 
	@$(RM) $(clean_list)
	@$(RM) $(LIBDEPS)


ifneq "$(MAKECMDGOALS)" "clean"
-include ${DEPS}
endif
	
