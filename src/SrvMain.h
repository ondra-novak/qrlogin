/*
 * SrvMain.h
 *
 *  Created on: 31.3.2015
 *      Author: ondra
 */

#ifndef QRPASS_BREDY_SRVMAIN_H_
#define QRPASS_BREDY_SRVMAIN_H_

#include "httpserver/serverMain.h"
#include "jsonrpc/ijsonrpc.h"
#include "httpserver/simpleWebSite.h"
#include "lightspeed/base/containers/string.h"

#include "RewritePath.h"





namespace qrpass {

using namespace LightSpeed;
using namespace BredyHttpSrv;

class SrvMain: public BredyHttpSrv::AbstractServerMain {
public:
	SrvMain();

	virtual natural onInitServer(const Args& args, SeqFileOutput serr, const IniConfig &config);
	virtual natural onStartServer(IHttpMapper &httpMapper);

	AllocPointer<SimpleWebSite> website;



	class Response: public IHttpHandler {
	public:
		Response(SrvMain &owner):owner(owner) {}
		virtual natural onRequest(IHttpRequest &request, ConstStrA vpath);
		virtual natural onData(IHttpRequest &) {return 0;}
		SrvMain &owner;
	};

	class LoginMonitor: public IHttpHandler {
	public:
		LoginMonitor(SrvMain &owner):owner(owner) {}
		virtual natural onRequest(IHttpRequest &request, ConstStrA vpath);
		virtual natural onData(IHttpRequest &) {return 0;}
		SrvMain &owner;
	};

	class WaitingResponse: public IHttpHandlerContext {
	public:
		StringA ident;
		POutputStream output;
		SrvMain &owner;
		bool asEventStream;

		WaitingResponse(StringA ident,POutputStream request,SrvMain &owner,
				bool asEventStream);

		void sendAcceptedResponse(ConstStrA response,natural timestamp);
		bool ping()const ;
	};


	class Verify: public IHttpHandler {
	public:
		Verify(SrvMain &owner):owner(owner) {}
		SrvMain &owner;

		virtual natural onRequest(IHttpRequest &request, ConstStrA vpath);
		virtual natural onData(IHttpRequest &) {return 0;}
	};

	class VerifySignature : public IHttpHandler {
	public:
		VerifySignature(SrvMain &owner) :owner(owner) {}
		SrvMain &owner;

		virtual natural onRequest(IHttpRequest &request, ConstStrA vpath);
		virtual natural onData(IHttpRequest &) { return 0; }
	};


	class GetIdentity: public IHttpHandler {
	public:
		GetIdentity(SrvMain &owner):owner(owner) {}
		SrvMain &owner;

		virtual natural onRequest(IHttpRequest &request, ConstStrA vpath);
		virtual natural onData(IHttpRequest &) {return 0;}
	};

	class Backup: public IHttpHandler {
	public:
		SrvMain &owner;
		Backup(SrvMain &owner):owner(owner) {}

		virtual natural onRequest(IHttpRequest &request, ConstStrA vpath);
		virtual natural onData(IHttpRequest &) {return 0;}
	};

	class ReceiveSign : public IHttpHandler {
	public:
		SrvMain &owner;
		ReceiveSign(SrvMain &owner) :owner(owner) {}
		virtual natural onRequest(IHttpRequest &request, ConstStrA vpath);
		virtual natural onData(IHttpRequest &) { return 0; }
	};

	class BitID : public IHttpHandler {
	public:
		SrvMain &owner;
		BitID(SrvMain &owner) :owner(owner) {}
		virtual natural onRequest(IHttpRequest &request, ConstStrA vpath);
		virtual natural onData(IHttpRequest &) { return 0; }
	};

	RewritePath challenge;
	RewritePath identReset;
	RewritePath frame;
	RewritePath auth;
	RewritePath manage;
	RewritePath restoreKey;
	RewritePath msign;
	Response response;
	LoginMonitor loginMonitor;
	Verify verify;
	GetIdentity getIdent;
	Backup rcvBackup;
	ReceiveSign rcvSign;
	VerifySignature verifySignature;
	BitID bitid;
		

	FilePath apikeys;

	StringA getRedirFromApiKey(ConstStrA apiKey) const;


	typedef Map<StringA, SharedPtr<WaitingResponse> > MonReg;
	typedef Map<StringA, StringA> TokenMap;

	MonReg monRegs;
	FastLock lock;

	TokenMap tokenMap[2];
	TokenMap backupMap[2];
	FastLock tokenMapLock;
	TimeStamp lastTokenShiftTime;
	TimeStamp lastBackupShiftTime;

	StringA createToken(StringA signature, StringA identity);
	StringA getIdentityFromToken(StringA token);
	StringA getIdentityFromToken_lk(StringA token);
	void shiftBanksIfNeeded();

	bool registerMonitor(StringA ident, WaitingResponse *response);
	bool acceptLogin(StringA ident, StringA response, natural timestamp);
	void failedLogin(StringA ident);
	void pingActive();
	void scheduledPing(IJobScheduler *scheduler);
	bool receiveBackup(StringA chanId, StringA content, bool restore);
	StringA getBackupFile(StringA ident);
	StringA getBackupFile_lk(StringA ident);
	bool receiveSignatue(StringA chanId, StringA content);
};

} /* namespace qrpass */
#endif /* QRPASS_BREDY_SRVMAIN_H_ */
