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
#include <lightspeed/base/containers/convertString.tcc>
#include <lightspeed/utils/json/jsonfast.tcc>
#include "lightspeed/utils/md5iter.h"
#include <openssl/sha.h>
#include "lightspeed/utils/base64.h"

#include "lightspeed/base/debug/dbglog.h"
#include "lightspeed/base/text/textstream.tcc"
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
	,msign("/msign.html")
	,response(*this)
	,loginMonitor(*this)
	,verify(*this)
	,getIdent(*this)
	,rcvBackup(*this)
	,rcvSign(*this)
	,verifySignature(*this)
	,bitid(*this)
	,lastTokenShiftTime(integer(0))
	,lastBackupShiftTime(integer(0))

{

}

natural SrvMain::onInitServer(const Args& , SeqFileOutput ,
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
	httpMapper.addSite("/token",&verify);
	httpMapper.addSite("/ident",&getIdent); //<obsolete
	httpMapper.addSite("/e",&identReset);
	httpMapper.addSite("/frame",&frame);
	httpMapper.addSite("/auth",&auth);
	httpMapper.addSite("/backup",&rcvBackup);
	httpMapper.addSite("/k",&restoreKey);
	httpMapper.addSite("/s", &msign);
	httpMapper.addSite("/sign", &rcvSign);
	httpMapper.addSite("/verify", &verifySignature);
	httpMapper.addSite("/callback", &bitid);

	IJobScheduler &scheduler = httpMapper.getIfc<IJobScheduler>();
	scheduler.schedule(ThreadFunction::create(this,&SrvMain::scheduledPing,&scheduler),30);

	return 0;
}


bool SrvMain::registerMonitor(StringA ident, WaitingResponse* response) {
	Synchronized<FastLock> _(lock);
	LS_LOG.progress("Registering identity: %1") << ident;
	bool exists;
	monRegs.insert(ident,response,&exists);
	return !exists;
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
			int delta = abs((int)((TimeStamp::now() - TimeStamp::fromUnix(timestamp)).getMins()));
			if (delta >= 5) {
				request.status(410);
				request.sendHeaders();
				return 0;
			}


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

	StringA code = response+ConstStrA(":")+ ToString<natural>(timestamp,16);

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
	scheduler->schedule(ThreadFunction::create(this,&SrvMain::scheduledPing,scheduler),30);
}

bool SrvMain::receiveSignatue( StringA chanId, StringA content )
{
	LS_LOGOBJ(lg);
	bool result =  acceptLogin(chanId,content,0);
	
	lg.progress("Received signature: channel=%1, signature=%2, result=%3")
		<< chanId << content << result;

	return result;
	
}

bool SrvMain::receiveBackup(StringA chanId, StringA content, bool restore)
{
	LS_LOGOBJ(lg);
	{
		Synchronized<FastLock> _(tokenMapLock);
		bool exist = false;
		backupMap[0].insert(chanId, content, &exist);
		if (exist) return false;
	}
	bool result = restore || acceptLogin(chanId, "backup", 0);

	lg.progress("Received key backup: channel=%1, restore=%2, result=%3")
		<< chanId << restore << result;

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

static const char *bitcoinprefix = "Bitcoin Signed Message:\n";


natural SrvMain::Verify::onRequest(IHttpRequest& request, ConstStrA ) {

	StringA code;
	StringA apikey;

	request.header(IHttpRequest::fldAccessControlAllowOrigin, "*");
	request.header(IHttpRequest::fldAccessControlAllowMethods, "POST, OPTIONS");

	if (request.getMethod() == "OPTIONS") {
		return stOK;
	}

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
		ConstStrA time = iter.getNext();
		ConstStrA challenge = iter.getNext();
		natural ntime = 0;
		parseUnsignedNumber(time.getFwIter(),ntime,16);
		if ((TimeStamp::now() - TimeStamp::fromUnix(ntime)).getMins() > 5)
				return sendOAuth2Error(request,"invalid_grant");

		StringA address;
		StringA msg;

		if (challenge.head(5) == ConstStrA("bitid") && iter.hasItems()) {
			//bitid verification;
			challenge = code.offset(challenge.data() - code.data());
			ConstStrA host = challenge.offset(6);
			if (host.head(2) == ConstStrA("//")) host = host.offset(2);
			natural sep = host.find('/');
			if (sep == naturalNull) {
				return sendOAuth2Error(request, "invalid_code");
			}
			host = host.head(sep);
			if (host != apikey) {
				return sendOAuth2Error(request, "invalid_grant");
			}
			msg = challenge;
		}
		else {
			msg = ConstStrA("login to ") + apikey + ConstStrA(", challenge is ") + challenge + ConstStrA(", timestamp ") + ToString<natural>(ntime);
		}
		address = generateAddressFromSignature(0, bitcoinprefix, msg, sign);

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

natural SrvMain::GetIdentity::onRequest(IHttpRequest& request,ConstStrA ) {
	HeaderValue auth = request.getHeaderField(IHttpRequest::fldAuthorization);
	TextParser<char, SmallAlloc<256> > parser;
	if (!parser(" Bearer %1 ",auth)) return stForbidden;

	request.header(IHttpRequest::fldContentType,"application/json");

	StringA token = parser[1].str();
	StringA ident = owner.getIdentityFromToken(token);
	if (ident.empty()) return stForbidden;

	JSON::Builder json;
	JSON::PNode response = json("identity", ident)("id", ident)
		("email", StringA(ident + ConstStrA("@fakemail.") + request.getHeaderField(IHttpRequest::fldHost)));

	request.sendHeaders();

	SeqFileOutput out(&request);
	JSON::toStream(response,out,false);
	return 0;
}

LightSpeed::natural SrvMain::Backup::onRequest( IHttpRequest &request, ConstStrA vpath )
{
	StringA c;
	QueryParser qp(vpath);
	bool restore = false;
	while (qp.hasItems()) {
		const QueryField &qf = qp.getNext();
		if (qf.name == "c") c= qf.value;
		if (qf.name == "restore") restore = true;
	}

	if (c.empty()) return stNotFound;

	if (request.getMethod() == "POST") {

		AutoArrayStream<char> buffer;
		SeqFileInput fin(&request);
		SeqTextInA txtin(fin);
		buffer.copy(txtin);
		if (owner.receiveBackup(c,buffer.getArray(), restore)) return stCreated;
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


LightSpeed::natural SrvMain::ReceiveSign::onRequest(IHttpRequest &request, ConstStrA vpath)
{
	StringA c;
	StringA s;
	QueryParser qp(vpath);
	bool restore = false;
	while (qp.hasItems()) {
		const QueryField &qf = qp.getNext();
		if (qf.name == "c") c = qf.value;
		if (qf.name == "s") s = qf.value;
	}

	if (c.empty()) return stNotFound;
	return owner.receiveSignatue(c, s) ? stOK : 409;
}

LightSpeed::natural SrvMain::VerifySignature::onRequest(IHttpRequest &request, ConstStrA vpath)
{
	StringA code;

	request.header(IHttpRequest::fldAccessControlAllowOrigin, "*");
	request.header(IHttpRequest::fldAccessControlAllowMethods, "GET, OPTIONS");

	if (request.getMethod() == "OPTIONS") {
		return stOK;
	}

	if (request.getMethod() == "GET") {

		request.header(IHttpRequest::fldContentType, "application/json");

		QueryParser qp(vpath);
		while (qp.hasItems()) {
			const QueryField &qf = qp.getNext();
			if (qf.name == "code") code = qf.value;
		}

		StringA::SplitIterator iter = code.split(':');
		ConstStrA sign = iter.getNext();
		ConstStrA time = iter.getNext();
		ConstStrA challenge = iter.getNext();
		natural ntime = 0;
		parseUnsignedNumber(time.getFwIter(), ntime, 16);
		if (ntime != 0) return 403;
		StringA address = coinstock::generateAddressFromSignatureAndHash(0, challenge, sign);


		JSON::Builder json;
		JSON::PNode response = json("signature", sign)
			("identity", address);

		if (address.empty()) return stForbidden;
		request.sendHeaders();

		SeqFileOutput out(&request);
		JSON::toStream(response, out, false);

		LS_LOG.info("message: %1 - signature: %2 - address: %3") << challenge << sign << address;
		return 0;

	}

	return 0;
}

LightSpeed::natural SrvMain::BitID::onRequest(IHttpRequest &request, ConstStrA vpath)
{
	if (request.getMethod() != "POST") {
		request.header(IHttpRequest::fldAllow, "POST");
		return stMethodNotAllowed;
	}

	SeqFileInput stream(&request);
	SeqTextInA textstream(stream);
	JSON::Value data = JSON::parseFast(textstream);

	/*{"address":"1Lx2vH4s7FCLmyU1pjPX2VVwPM3VpU9o7K",
	   "signature":"H9DSVrhIN1ZFSjvkeOflu/15RBv49kCHE8q4hr0CpqK3AYYdLueXiKvx5hUdmU68oREKAmUSM+wPOyzLBX02PrY=",
	   "uri":"bitid://192.168.100.244:14526/callback?x=jo_fSjWNhi3pddgJyP9ATelJbYKwAzBWAAAAAA&u=1"*/

	ConstStrA signature = data["signature"]->getStringUtf8();
	ConstStrA uri = data["uri"]->getStringUtf8();
	ConstStrA address = data["address"]->getStringUtf8();

	LS_LOG.progress("BitID login: address: %1 - signature: %2 - uri: %3") << address << signature << uri;

	QueryParser qp(uri);
	StringA x;
	while (qp.hasItems()) {
		QueryField qf = qp.getNext();
		if (qf.name == "x") x = qf.value;
	}

	StringB bin = convertString(Base64Decoder(), ConstStrA(x));
	ConstBin timebin = bin.tail(8);
	lnatural timet = timebin[7];
	timet = timet << 8 | timebin[6];
	timet = timet << 8 | timebin[5];
	timet = timet << 8 | timebin[4];
	timet = timet << 8 | timebin[3];
	timet = timet << 8 | timebin[2];
	timet = timet << 8 | timebin[1];
	timet = timet << 8 | timebin[0];

	CArray<byte, 32> sha256bin;

	SHA256(reinterpret_cast<const unsigned char *>(x.data()), x.length(), sha256bin.data());

	StringA channId = convertString(HexEncoder<>(), ConstBin(sha256bin));

	if (owner.acceptLogin(channId, signature, (natural)timet)) return stOK;
	else {
		request.status(410, "Gone");
		request.header(IHttpRequest::fldContentType, "text/plain");
		SeqFileOutput out(&request);
		PrintTextA print(out);
		print("This QR is no longer valid. Please try again.");
	}



	return stOK;
}

} /* namespace qrpass */

