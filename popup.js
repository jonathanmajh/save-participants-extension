'use strict';
var monitorParticipantsButton = document.getElementById('monitorParticipantsButton');
var participantNumber = document.getElementById('participantNumber');

chrome.tabs.query({
    active: true,
    currentWindow: true
}, function (tabs) {
    chrome.scripting.executeScript(
        {
            target: { tabId: tabs[0].id },
            files: ['contentscript.js']
        }, function () {
            console.log("Content script injected!");
            // Update the description of the button
            chrome.tabs.sendMessage(tabs[0].id, 'sp-monitor-is-enabled', function (monitor_enabled) {
                if (chrome.runtime.lastError) {
                    console.log('ERROR: 2:', chrome.runtime.lastError);
                } else {
                    if (monitor_enabled) {
                        monitorParticipantsButton.innerHTML = "Stop Monitoring";
                    } else {
                        monitorParticipantsButton.innerHTML = "Start Monitoring";
                    }
                }
            });
            chrome.tabs.sendMessage(tabs[0].id, 'number_of_participants', function (pNumber) {
                if (chrome.runtime.lastError) {
                    console.log('ERROR: 6:', chrome.runtime.lastError);
                } else {
                    console.log(pNumber);
                    participantNumber.innerHTML = pNumber;
                    if (pNumber === 0) {
                        alert('Please open the People list and open the extension again');
                    }
                }
            });
        });
});

var downloadParticipantsButton = document.getElementById('downloadParticipantsButton');
downloadParticipantsButton.onclick = function () {
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, 'sp_download_list', function () {
            if (chrome.runtime.lastError) {
                console.log('ERROR: 1:', chrome.runtime.lastError);
            }
        })
    });
};

monitorParticipantsButton.onclick = function (element) {
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, 'sp-monitor-is-enabled', function (monitor_enabled) {
            if (chrome.runtime.lastError) {
                console.log('ERROR: 5:', chrome.runtime.lastError);
            } else {
                console.log('Monitor Enabled = ', monitor_enabled);
                if (!monitor_enabled) {
                    chrome.tabs.sendMessage(tabs[0].id, 'sp_start_monitor', function () {
                        if (chrome.runtime.lastError) {
                            console.log('ERROR: 3:', chrome.runtime.lastError);
                        }
                    })
                    monitorParticipantsButton.innerHTML = "Stop Monitoring";
                } else {
                    chrome.tabs.sendMessage(tabs[0].id, 'sp_stop_monitor', function () {
                        if (chrome.runtime.lastError) {
                            console.log('ERROR: 4:', chrome.runtime.lastError);
                        }
                    })
                    monitorParticipantsButton.innerHTML = "Start Monitoring";
                }
            }
        })
    })
}