.INTERMEDIATE: testfn testbuildin

testfn:
	@echo 'echo "void $$1(); int main() {$$1();return 0;}" > testfn.c' >$@
	@echo 'if gcc -o testfn.out testfn.c 2> /dev/null; then echo "#define $$2 1"; else echo "#defined $$2 0"; fi' >>$@
	@echo 'rm -f testfn.out testfn.c' >>$@
	@chmod +x $@

testbuildin:
	@echo 'echo "int main() {$$1;return 0;}"  > testfn.c' >$@
	@echo 'if gcc -o testfn.out testfn.c 2> /dev/null; then echo "#define $$2 1"; else echo "#defined $$2 0"; fi' >>$@
	@echo 'rm -f testfn.out testfn.c' >>$@
	@chmod +x $@

