
var requestMap = new Map();
var headersMap = new Map();
var registerMap = new Map();

chrome.webRequest.onCompleted.addListener(function(request){
    recordLog(request);
},{
    urls: ["https://*/*"]
}, ["responseHeaders"]);


chrome.webRequest.onErrorOccurred.addListener(function(request){
    recordLog(request);
},{
    urls: ["https://*/*"]
});

chrome.webRequest.onBeforeSendHeaders.addListener(function(request){
    recordHeaders(request);
},{
    urls: ["https://*/*"]
}, ["requestHeaders"]);

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the extension");
    if (request.message == "fetchLogs")
      sendResponse({data: requestMap.get(request.tabId)});

    if (request.message == "register") {
      registerTab(request.tabId);
      sendResponse({ack: 'Done!'});   
    }

    if (request.message == "unregister") {
      unRegisterTab(request.tabId);
      sendResponse({ack: 'Done!'});  
    }

    if (request.message == "fetchRecordingStatus")
      sendResponse({isRecording: isRegistered(request.tabId)});
    
  });

function registerTab(tabId){
    if(registerMap.get(tabId) !== undefined) {
        return;
    } 
    registerMap.set(tabId, {});
}

function unRegisterTab(tabId){
    if(registerMap.get(tabId) === undefined) {
        return;
    } 
    registerMap.delete(tabId);
}

function isRegistered(tabId) {
    return registerMap.get(tabId) !== undefined
}

function recordLog(request) {

    if(!isRegistered(request.tabId)) {
        console.log('tab not registered skipping log');
        requestMap.delete(request.tabId);
        return;
    }

    if (requestMap.get(request.tabId) == undefined || requestMap.get(request.tabId) == null) {
        requestMap.set(request.tabId, new Array());
    }

    var requestArray =  requestMap.get(request.tabId);
    requestArray.push(request);

    if (headersMap.get(request.requestId) === undefined || headersMap.get(request.requestId) === null ) {
        console.error('Request headers are absent for the request ' + request.requestId);        
    }

    request.requestHeaders = headersMap.get(request.requestId);
    headersMap.delete(request.requestId);

    var port = chrome.runtime.connect({name:"test"});
    port.postMessage(request);

}

function recordHeaders(request) {

        if(!isRegistered(request.tabId)) {
            console.log('tab not registered skipping log');
            headersMap.delete(request.requestId);
            return;
        }
    
        if (headersMap.get(request.requestId) != undefined && headersMap.get(request.requestId) == null) {
            console.error('Already headers are set for the request id');
        }    

        headersMap.set(request.requestId, request.requestHeaders);
    }

