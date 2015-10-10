
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


ifneq "$(MAKECMDGOALS)" "clean"
NEEDLIBSDEPS=$(addsuffix /libdeps.mk,$(NEEDLIBS))
include  $(NEEDLIBSDEPS)
endif


ifeq "$(MAKECMDGOALS)" "debug"
CXXFLAGS += -O0 -g3 -fPIC -Wall -Wextra -DDEBUG -D_DEBUG $(INCLUDES)
CFGNAME := cfg.debug
-include $(CFGNAME)	
else 
CXXFLAGS += -O3 -g3 -fPIC -Wall -Wextra -DNDEBUG $(INCLUDES)
CFGNAME := cfg.release
ifeq "$(MAKECMDGOALS)" "all"
-include $(CFGNAME)	
endif
endif


OBJS += ${CPP_SRCS:.cpp=.o}
DEPS := ${CPP_SRCS:.cpp=.deps}
clean_list += $(OBJS)  ${DEPS} $(TARGETFILE) cfg.debug cfg.release $(CONFIG)


.PHONY: debug all debug clean force-rebuild deps

force-rebuild: 
	@rm -f cfg.debug cfg.release $(TARGETFILE)

$(CFGNAME):
	@for X in $(NEEDLIBS); do $(MAKE) -C $$X force-rebuild; done
	@rm -f cfg.debug cfg.release
	@touch $@	
	@echo $(PROGRESSPREFIX): Forced rebuild for CXXFLAGS=$(CXXFLAGS)


%.o: %.cpp  $(CONFIG) $(CFGNAME)
	@set -e
	@echo $(PROGRESSPREFIX): $(*F).cpp  
	@$(CXX) $(CXXFLAGS) $(INCLUDES) -o $@ -c $*.cpp -MMD -MF $*.deps

