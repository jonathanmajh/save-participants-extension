chrome.runtime.onInstalled.addListener(function () {
    // Add a listener for tab updates
    chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
        if (changeInfo.status === "complete" && tab.url) {
            const url = new URL(tab.url);

            // Check for specific hostnames
            if (url.host === "teams.microsoft.com") {
                // Show the action icon
                chrome.action.enable(tabId);
            } else {
                // Hide the action icon
                chrome.action.disable(tabId);
            }
        }
    });
});

function downloadBlobAsFile(blob, filename) {
    const reader = new FileReader();
    reader.onload = function () {
        chrome.downloads.download({
            url: reader.result,
            filename: filename
        });
    };
    reader.readAsDataURL(blob); // Convert Blob to Data URL
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.action == "download") {
            let msg = request.message;
            let monitor = request.monitor;

            // Format the date to be appended to the filename; unfortunately
            // Chrome does not allow to use ':' in filenames, so we cannot 
            // really format times as one would expect. 
            let now = new Date();
            let filename = 'participants-' + 
                (monitor ? 'monitor-' : '') +
                now.getFullYear() + '-' +
                (now.getMonth() + 1).toString().padStart(2, "0") + '-' +
                now.getDate().toString().padStart(2, "0") + '_' +
                now.getHours().toString().padStart(2, "0") + '-' +
                now.getMinutes().toString().padStart(2, "0") + '-' + 
                now.getSeconds().toString().padStart(2, "0") + 
                '.txt';

            var blob = new Blob([msg], {
                type: "text/plain"
            });
            downloadBlobAsFile(blob, filename);
            sendResponse({
                status: 'completed'
            });
        }
    }
);