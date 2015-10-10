# goals
#
# all - build all release
# debug - build debug version
# force-rebuild - requests rebuild, next all or debug will rebuild 




TARGETFILE=$(APPNAME)
PROGRESSPREFIX=$(APPNAME)


include $(dir $(lastword $(MAKEFILE_LIST)))/common.mk

LDLIBS+=$(LDOTHERLIBS)

$(APPNAME): $(OBJS) $(LIBPATHS)
	@echo "$(APPNAME) Linking ... $(LDLIBS)"
ifneq "$(notdir $(APPNAME))" "$(APPNAME)"		
	@mkdir -p $(@D)
endif
	@$(CXX) $(LDFLAGS) -o $@ $(OBJS) $(LDLIBS) 
	

clean:
	@echo $(APPNAME): cleaning  
	@$(RM) $(clean_list)
	@for X in $(NEEDLIBS); do $(MAKE) -C $$X clean; done
	


ifneq "$(MAKECMDGOALS)" "clean"
-include ${DEPS}
endif
	
