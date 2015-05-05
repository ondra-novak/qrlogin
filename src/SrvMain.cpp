/*
 * SrvMain.cpp
 *
 *  Created on: 31.3.2015
 *      Author: ondra
 */

#include "SrvMain.h"

#include <httpserver/queryParser.h>
#include <lightspeed/base/interface.tcc>
#include "lightspeed/utils/FilePath.tcc"
#include "signmsg.h"
#include <lightspeed/utils/configParser.tcc>
#include <lightspeed/utils/urlencode.h>
#include <lightspeed/base/containers/convertString.h>
#include <lightspeed/utils/json/jsonfast.h>
#include "lightspeed/utils/md5iter.h"
#include <openssl/sha.h>
#include "lightspeed/utils/base64.h"

#include "lightspeed/base/debug/dbglog.h"
using BredyHttpSrv::QueryParser;
using coinstock::generateAddressFromSignature;
using LightSpeed::UrlEncoder;
using LightSpeed::convertString;
using LightSpeed::HexEncoder;

namespace qrpass {

static SrvMain theApp;



SrvMain::SrvMain()
	:challenge("/challenge.html")
	,identReset("/identreset.html") //<obsolete
	,frame("/frame.html")
	,auth("/auth.html")
	,manage("/manage.html")
	,restoreKey("/restore.html")
	,response(*this)
	,loginMonitor(*this)
	,verify(*this)
	,getIdent(*this)
	,rcvBackup(*this)
	,lastTokenShiftTime(integer(0))
	,lastBackupShiftTime(integer(0))

{

}

natural SrvMain::onInitServer(const Args& args, SeqFileOutput serr,
		const IniConfig& config) {

	FilePath root (getAppPathname());
	String documentRoot;
	IniConfig::Section webcfg = config.openSection("website");
	webcfg.required(documentRoot,"documentRoot");

	website = new SimpleWebSite(root/documentRoot/nil);



	return 0;
}


natural SrvMain::onStartServer(BredyHttpSrv::IHttpMapper& httpMapper) {

	httpMapper.addSite("",website);
	httpMapper.addSite("/c",&challenge);
	httpMapper.addSite("/m",&manage);
	httpMapper.addSite("/r",&response);
	httpMapper.addSite("/l",&loginMonitor);
	httpMapper.addSite("/verify",&verify);
	httpMapper.addSite("/token",&verify);
	httpMapper.addSite("/ident",&getIdent); //<obsolete
	httpMapper.addSite("/e",&identReset);
	httpMapper.addSite("/frame",&frame);
	httpMapper.addSite("/auth",&auth);
	httpMapper.addSite("/backup",&rcvBackup);
	httpMapper.addSite("/k",&restoreKey);

	IJobScheduler &scheduler = httpMapper.getIfc<IJobScheduler>();
	scheduler.schedule(ThreadFunction::create(this,&SrvMain::scheduledPing,&scheduler),30,ThreadMode::schedulerThread);

	return 0;
}


bool SrvMain::registerMonitor(StringA ident, WaitingResponse* response) {
	Synchronized<FastLock> _(lock);
	LS_LOG.progress("Registering identity: %1") << ident;
	monRegs.replace(ident,response);
	return true;
}

bool SrvMain::acceptLogin(StringA ident, StringA response, natural timestamp) {
	Synchronized<FastLock> _(lock);
	SharedPtr<WaitingResponse> *r = monRegs.find(ident);
	if (r)  {
		LS_LOG.progress("Accepted message from identity: %1") << ident;
		(*r)->sendAcceptedResponse(response,timestamp);
		monRegs.erase(ident);
		return true;
	} else {
		LS_LOG.progress("Rejected message from identity: %1") << ident;
		return false;
	}
}

void SrvMain::failedLogin(StringA ident) {
	Synchronized<FastLock> _(lock);
	monRegs.erase(ident);

}


natural SrvMain::Response::onRequest(IHttpRequest& request, ConstStrA vpath) {
	QueryParser qp(vpath);
	StringA ident;
	StringA response;
	natural timestamp;
	bool quiet = false;

	while (qp.hasItems()) {
		const QueryField &qf = qp.getNext();
		if (qf.name == "c") ident = qf.value;
		if (qf.name == "r") response = qf.value;
		if (qf.name == "t") {
			if (!parseUnsignedNumber(qf.value.getFwIter(),timestamp,10)) return stNotFound;
		}
		if (qf.name == "q") {
			quiet = qf.value == "1";
		}
	}

	bool result = owner.acceptLogin(ident,response,timestamp);
	if (quiet) {
		request.status(result?200:409);
		request.sendHeaders();
		return 0;
	} else {
		return result?request.callHandler("/loginok.html"):request.callHandler("/loginfailed.html");
	}

}

natural SrvMain::LoginMonitor::onRequest(IHttpRequest& request,
		ConstStrA vpath) {

	QueryParser qp(vpath);
	StringA ident;

	while (qp.hasItems()) {
		const QueryField &qf = qp.getNext();
		if (qf.name == "c") ident = qf.value;
	}
	if (ident.empty()) return stNotFound;

	POutputStream out = request.getConnection().getMT().get();
	request.header(IHttpRequest::fldTransferEncoding,"identity");
	request.header(IHttpRequest::fldConnection,"close");

	IHttpRequest::HeaderValue accept = request.getHeaderField(IHttpRequest::fldAccept);
	bool asEventStream = accept.defined && accept == "text/event-stream";
	if (asEventStream) request.header(IHttpRequest::fldContentType,"text/event-stream;charset=UTF-8");


	if (owner.registerMonitor(ident,new WaitingResponse(ident.getMT(),
				out.getMT(),owner,asEventStream))) {
		request.sendHeaders();
		return stOK;
	} else{
		return 409;
	}
}

SrvMain::WaitingResponse::WaitingResponse(StringA ident,
		POutputStream output, SrvMain& owner,bool asEventStream)
	:ident(ident),output(output),owner(owner),asEventStream(asEventStream)
{
}


void SrvMain::WaitingResponse::sendAcceptedResponse(ConstStrA response, natural timestamp) {

	StringA code = response+ConstStrA(":")+ident+ConstStrA(":") + ToString<natural>(timestamp,16);

	try {
		if (asEventStream) {
			output->writeAll("data: ",6);
			output->writeAll(code.data(),code.length());
			output->writeAll("\r\n\r\n",4);
		} else {
			output->writeAll(code.data(),code.length());
			output->writeAll("\r\n",2);
		}
		output->flush();
		output->closeOutput();
	} catch (...) {

	}
}

void SrvMain::pingActive() {
	Synchronized<FastLock> _(lock);
	AutoArray<StringA> identsToErase;
	for (MonReg::Iterator iter = monRegs.getFwIter(); iter.hasItems();) {
		const MonReg::Entity &item = iter.getNext();
		if (!item.value->ping()) identsToErase.add(item.key);
	}
	for (natural i = 0; i < identsToErase.length(); i++) {
		LS_LOG.progress("Erased registration - ping failed: %1") << identsToErase[i];
		monRegs.erase(identsToErase[i]);
	}
}

bool SrvMain::WaitingResponse::ping() const {
	try {
		if (asEventStream) {
			output->writeAll(":pulse\r\n\r\n",10);
		} else {
			output->writeAll("\r\n",2);
		}
		output->flush();
		return true;
	} catch (...) {
		return false;
	}
}

StringA SrvMain::getRedirFromApiKey(ConstStrA apiKey) const {
	try {
		if (apiKey.find('/') != naturalNull) return StringA();
		IniConfig ini(FilePath(apikeys/apiKey),0,false);
		IniConfig::Section sec = ini.openSection("client");
		ConstStrA redir;
		ConstStrA expires;
		sec.required(redir,"redir");
		sec.required(expires,"expires");
		TimeStamp expiresTm = TimeStamp::fromDBTime(expires);
		if (expiresTm < TimeStamp::now()) {
			LS_LOG.note("Api key expired: %1") << apiKey;
			return StringA();
		}
		return redir;
	} catch (std::exception &e) {
		LS_LOG.info("Invalid api key: %1 - %2") << apiKey << e.what();
		return StringA();
	}



}


StringA SrvMain::createToken(StringA signature, StringA identity) {
	Synchronized<FastLock> _(tokenMapLock);
	unsigned char hash[SHA256_DIGEST_LENGTH];
	 SHA256_CTX sha256;
	 SHA256_Init(&sha256);
	 SHA256_Update(&sha256, signature.data(), signature.length());
	 SHA256_Final(hash, &sha256);
	 StringA token = convertString(HexEncoder<>(),ConstBin(hash,SHA256_DIGEST_LENGTH));
	 if (getIdentityFromToken_lk(token).empty()) {
		tokenMap[0].insert(token,identity);
		return token;
	} else {
		return StringA();
	}

}

StringA SrvMain::getIdentityFromToken(StringA token) {
	Synchronized<FastLock> _(tokenMapLock);
	return getIdentityFromToken_lk(token);
}
StringA SrvMain::getIdentityFromToken_lk(StringA token) {
	const StringA *id = tokenMap[0].find(token);
	if (id == 0) id = tokenMap[1].find(token);
	if (id == 0) return StringA();
	else return *id;
}

StringA SrvMain::getBackupFile(StringA ident) {
	Synchronized<FastLock> _(tokenMapLock);
	StringA bkf = getBackupFile_lk(ident);
	LS_LOG.progress("Giving out key-backup file: ident=%1, result=%2")
		<< ident << !bkf.empty();
	return bkf;

}
LightSpeed::StringA SrvMain::getBackupFile_lk(StringA ident) {
	const StringA *id = backupMap[0].find(ident);
	StringA out;
	if (id == 0) {
		id = backupMap[1].find(ident);
		if (id == 0) {
			return StringA();
		} else {
			out = *id;
			backupMap[1].erase(ident);
		}
	} else {
		out = *id;
		backupMap[0].erase(ident);
	}
	return out;
}


void SrvMain::shiftBanksIfNeeded() {
	LS_LOGOBJ(lg);
	Synchronized<FastLock> _(tokenMapLock);
	TimeStamp now = TimeStamp::now();
	TimeStamp ellapsed = now - lastTokenShiftTime;
	if (ellapsed.getHours() >= 1) {
		tokenMap[0].swap(tokenMap[1]);
		tokenMap[0].clear();
		lastTokenShiftTime = now;
		lg.info("Token map rotated");
	}
	ellapsed = now - lastBackupShiftTime;
	if (ellapsed.getMins() >= 1) {
		backupMap[0].swap(backupMap[1]);
		backupMap[0].clear();
		lastBackupShiftTime = now;
		lg.info("Backup map rotated");
	}


}

void SrvMain::scheduledPing(IJobScheduler* scheduler) {
	pingActive();
	shiftBanksIfNeeded();
	scheduler->schedule(ThreadFunction::create(this,&SrvMain::scheduledPing,scheduler),30,ThreadMode::schedulerThread);
}

bool SrvMain::receiveBackup( StringA chanId, StringA content, bool print )
{
	LS_LOGOBJ(lg);
	{
		Synchronized<FastLock> _(tokenMapLock);
		bool exist = false;
		backupMap[0].insert(chanId,content,&exist);
		if (exist) return false;
	}
	bool result =  acceptLogin(chanId,print?"print":"backup",0);
	
	lg.progress("Received key backup: channel=%1, print=%2, result=%3")
		<< chanId << print << result;

	return result;
	
}

static natural sendOAuth2Error(IHttpRequest &request, ConstStrA error) {
	JSON::Builder json;
	request.status(400);
	JSON::PNode res = json("error",error);
	SeqFileOutput out(&request);
	JSON::toStream(res,out,false);
	return 0;

}

natural SrvMain::Verify::onRequest(IHttpRequest& request, ConstStrA vpath) {

	StringA code;
	StringA apikey;

	if (request.getMethod() == "POST") {
		AutoArrayStream<char> buff;
		buff.write('?');
		SeqFileInput in(&request);
		buff.copy(in);

		request.header(IHttpRequest::fldContentType,"application/json");

		QueryParser qp(buff.getArray());
		while (qp.hasItems()) {
			const QueryField &qf = qp.getNext();
			if (qf.name == "code") code= qf.value;
			if (qf.name == "client_id") apikey= qf.value;
		}

		StringA::SplitIterator iter = code.split(':');
		ConstStrA sign = iter.getNext();
		ConstStrA challenge = iter.getNext();
		ConstStrA time = iter.getNext();
		natural ntime = 0;
		parseUnsignedNumber(time.getFwIter(),ntime,16);
		if ((TimeStamp::now() - TimeStamp::fromUnix(ntime)).getMins() > 5)
				return sendOAuth2Error(request,"invalid_grant");
		StringA msg = ConstStrA("login to ")+apikey+ConstStrA(", challenge is ") + challenge + ConstStrA(", timestamp ") + ToString<natural>(ntime);
		StringA address = generateAddressFromSignature(0, "Bitcoin Signed Message:\n", msg, sign);

		StringA token = owner.createToken(code,address);
		if (token.empty())
			return sendOAuth2Error(request,"invalid_grant");

		JSON::Builder json;
		JSON::PNode response = json("access_token",token)
							   ("identity",address)
							   ("expires_in",3600)
							   ("token_type","Bearer");

		if (address.empty()) return stForbidden;
		request.sendHeaders();

		SeqFileOutput out(&request);
		JSON::toStream(response,out,false);

		LS_LOG.info("message: %1 - signature: %2 - address: %3") << msg << sign << address;
		return 0;

	}

	return 0;
}

natural SrvMain::GetIdentity::onRequest(IHttpRequest& request,ConstStrA vpath) {
	HeaderValue auth = request.getHeaderField(IHttpRequest::fldAuthorization);
	TextParser<char, SmallAlloc<256> > parser;
	if (!parser(" Bearer %1 ",auth)) return stForbidden;

	request.header(IHttpRequest::fldContentType,"application/json");

	StringA token = parser[1].str();
	StringA ident = owner.getIdentityFromToken(token);
	if (ident.empty()) return stForbidden;

	JSON::Builder json;
	JSON::PNode response = json("identity",ident);

	request.sendHeaders();

	SeqFileOutput out(&request);
	JSON::toStream(response,out,false);
	return 0;
}

LightSpeed::natural SrvMain::Backup::onRequest( IHttpRequest &request, ConstStrA vpath )
{
	StringA c;
	QueryParser qp(vpath);
	bool print = false;
	while (qp.hasItems()) {
		const QueryField &qf = qp.getNext();
		if (qf.name == "c") c= qf.value;
		if (qf.name == "print") print = true;
	}

	if (c.empty()) return stNotFound;

	if (request.getMethod() == "POST") {

		AutoArrayStream<char> buffer;
		SeqFileInput fin(&request);
		SeqTextInA txtin(fin);
		buffer.copy(txtin);
		if (owner.receiveBackup(c,buffer.getArray(), print)) return stCreated;
		else return 409;
	} else {
		StringA res = owner.getBackupFile(c);
		if (res.empty()) return stNotFound;

		request.header(IHttpRequest::fldContentType,"application/octet-stream");
		request.header(IHttpRequest::fldContentLength,ToString<natural>(res.length()));
		request.header(IHttpRequest::fldContentDisposition,"attachment;filename=qrlogin-secret.key");
		request.writeAll(res.data(),res.length());
		return stOK;
	}
}


} /* namespace qrpass */

