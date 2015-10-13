
all: $(TARGETFILE)
	@echo "Finished $(TARGETFILE)"
debug: $(TARGETFILE)
	@echo "Finished $(TARGETFILE) (debug)"

CPP_SRCS := 
OBJS := 
clean_list :=
include $(shell find $(SOURCES) -name .sources.mk)


libdeps%.mk:
	flock $(@D) -c "$(MAKE) -C $(@D) deps"

ifeq "$(MAKECMDGOALS)" "debug"
CXXFLAGS += -O0 -g3 -fPIC -Wall -Wextra -DDEBUG -D_DEBUG $(INCLUDES)
CFGNAME := tmp/cfg.debug
-include $(CFGNAME)	
else 
CXXFLAGS += -O3 -g3 -fPIC -Wall -Wextra -DNDEBUG $(INCLUDES)
CFGNAME := tmp/cfg.release
ifeq "$(MAKECMDGOALS)" "all"
-include $(CFGNAME)	
endif
endif


ifneq "$(MAKECMDGOALS)" "clean"
NEEDLIBSDEPS=$(addsuffix /libdeps.mk,$(NEEDLIBS))
include  $(NEEDLIBSDEPS)
endif




ROOT_DIR:=$(dir $(abspath $(lastword $(MAKEFILE_LIST))))
OBJS += $(patsubst %,tmp/%,${CPP_SRCS:.cpp=.o})
DEPS := $(patsubst %,tmp/%,${CPP_SRCS:.cpp=.deps})
clean_list += $(OBJS)  ${DEPS} $(TARGETFILE) tmp/cfg.debug tmp/cfg.release $(CONFIG) 

.PHONY: debug all debug clean force-rebuild deps 

force-rebuild: 
	@echo $(PROGRESSPREFIX): Requested rebuild
	@rm -f tmp/cfg.debug tmp/cfg.release $(TARGETFILE)
	
$(CFGNAME):
	@rm -f tmp/cfg.debug tmp/cfg.release
	@mkdir -p tmp
	@touch $@	
	@echo $(PROGRESSPREFIX): Forced rebuild for CXXFLAGS=$(CXXFLAGS)


tmp/%.o: %.cpp  $(CONFIG) $(CFGNAME)
	@set -e
	@mkdir -p $(@D) 
	@echo $(PROGRESSPREFIX): $(*F).cpp  
	@$(CXX) $(CXXFLAGS) $(INCLUDES) -o $@ -c $*.cpp -MMD -MF tmp/$*.deps

