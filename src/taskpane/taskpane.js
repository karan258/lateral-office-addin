/*
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

// images references in the manifest
import "../../assets/lateral_logo_16.png";
import "../../assets/lateral_logo_32.png";
import "../../assets/lateral_logo_80.png";

/* global Office, Word */

Office.onReady(info => {
  if (info.host === Office.HostType.Word) {
    document.getElementById("sideload-msg").style.display = "none";
    document.getElementById("app-body").style.display = "flex";

    $('[data-toggle="tooltip"]').tooltip();

    $("#serverSettings").prop("disabled", true);

    enableDisableButtonLogin();
    enableDisableButtonFetchServers();
    enableDisableButtonSaveTemplateToServer();
    enableDisableButtonSaveLetterToServer();
    updateUserState();

    getTemplates();
    getLetters();
    getVariables();

    document.getElementById("addVariable").onclick = addVariable;
    document.getElementById("login").onclick = authenticate;
    document.getElementById("logout").onclick = logout;
    document.getElementById("fetchServers").onclick = fetchServers;
    document.getElementById("loadLetter").onclick = loadLetter;
    document.getElementById("loadTemplate").onclick = loadTemplate;

    $("#saveTemplateToServer").click(function () {
      $("#saveTemplateToServer")
        .empty()
        .append('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving to Server...')
        .prop("disabled", true);
      createDocument("template");
    });
    $("#saveLetterToServer").click(function () {
      $("#saveLetterToServer")
        .empty()
        .append('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving to Server...')
        .prop("disabled", true);
      createDocument("letter");
    });

    $("#letters").change(function () {
      enableDisableButtonSaveLetterToServer();
    });

    $("#serverSettings").change(function () {
      enableDisableButtonLogin();
    });

    $("#templateName").blur(function () {
      enableDisableButtonSaveTemplateToServer();
    });

    $("#caseId").blur(function () {
      enableDisableButtonSaveLetterToServer();
    });

    $("#username").blur(function () {
      enableDisableButtonLogin();
    });

    $("#password").blur(function () {
      enableDisableButtonLogin();
    });

    $("#subDomain").change(function () {
      enableDisableButtonFetchServers();
    });

    $("#fromExistingTemplate").change(function () {
      enableDisableButtonSaveTemplateToServer();
      if ($(this).prop("checked")) {
        $("#templateName").val("");
        $("#templateNameDiv").hide();
        $("#selectTemplateDiv").show();
        $("#loadTemplate").show();
      } else {
        $("#selectTemplateDiv").hide();
        $("#loadTemplate").hide();
        $("#templateNameDiv").show();
      }
    });
  }
});

// Fetch templates from backend.
function getTemplates() {
  $("#templates")
    .prop("disabled", true)
    .css("background-size", "auto");
  const request = new XMLHttpRequest();

  request.onreadystatechange = function () {
    if (request.readyState == 4) {
      if (!JSON.parse(request.response).result) {
        updateStatus("Authentication token expired. Please login again.", "danger");
        setTimeout(function () {
          logout();
        }, 1000);
      } else {
        $("#templates")
          .prop("disabled", false)
          .css("background-size", "0%")
          .find('option').remove().end();
        for (const [key, value] of Object.entries(JSON.parse(request.response).data)) {
          $("#templates").append('<option value="' + key + '">' + value + "</option>");
        }
      }
    }
  };

  request.open("GET", window.localStorage.getItem("serverSettings") + "b/system/v3/letter/get_letter_details");
  request.setRequestHeader("authorisation", window.localStorage.getItem("token"));
  request.setRequestHeader("Accept", "application/json, text/plain, */*");
  request.send();
}

// Fetch letters from backend.
function getLetters() {
  $("#letters")
    .prop("disabled", true)
    .css("background-size", "auto");
  const request = new XMLHttpRequest();

  request.onreadystatechange = function () {
    if (request.readyState == 4) {
      if (!JSON.parse(request.response).result) {
        updateStatus("Authentication token expired. Please login again.", "danger");
        setTimeout(function () {
          logout();
        }, 1000);
      } else {
        $("#letters")
          .prop("disabled", false)
          .css("background-size", "0%")
          .find('option').remove().end();
        for (const [key, value] of Object.entries(JSON.parse(request.response).data)) {
          $("#letters").append('<option value="' + key + '">' + value + "</option>");
        }
      }
    }
  };

  request.open("GET", window.localStorage.getItem("serverSettings") + "b/system/v3/letter/get_letter_details");
  request.setRequestHeader("authorisation", window.localStorage.getItem("token"));
  request.setRequestHeader("Accept", "application/json, text/plain, */*");
  request.send();
}

// Fetch variables from backend.
function getVariables() {
  $("#variables").prop("disabled", true);
  $("#variables").css("background-size", "auto");
  const request = new XMLHttpRequest();

  request.onreadystatechange = function () {
    if (request.readyState == 4) {
      if (!JSON.parse(request.response).result) {
        updateStatus("Authentication token expired. Please login again.", "danger");
        setTimeout(function () {
          logout();
        }, 1000);
      } else {
        $("#variables").prop("disabled", false);
        $("#variables").css("background-size", "0%");
        $("#variables").find('option').remove().end();
        for (const [key, value] of Object.entries(JSON.parse(request.response).data.letter_variables_list)) {
          $("#variables").append('<option value="' + key + '">' + value + "</option>");
        }
      }
    }
  };

  request.open("GET", window.localStorage.getItem("serverSettings") + "b/system/v3/letter/get_variable_list");
  request.setRequestHeader("authorisation", window.localStorage.getItem("token"));
  request.setRequestHeader("Accept", "application/json, text/plain, */*");
  request.send();
}

// Fetch the list of available APIs from backend.
function fetchServers() {
  $("#fetchServers")
    .empty()
    .append('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Fetching Servers...')
    .prop("disabled", true);
  $("#subDomain").prop("disabled", true);
  $("#serverSettings").css("background-size", "auto");
  const request = new XMLHttpRequest();

  request.onreadystatechange = function () {
    if (request.readyState == 4) {
      $("#fetchServers")
        .empty()
        .append('Fetch Servers')
        .prop("disabled", false);
      $("#serverSettings").prop("disabled", false);
      $("#serverSettings").css("background-size", "0%");

      const serverSettings = JSON.parse(JSON.parse(request.response).data[0].server_settings);
      $("#serverSettings").find('option').remove().end();
      $("#serverSettings").append("<option>" + serverSettings.staging.url + "</option>");
      $("#serverSettings").append("<option>" + serverSettings.production.url + "</option>");
    }
  };

  request.open("GET", "https://lateral1.com/getServerSettings.php?code=" + $("#subDomain").val());
  request.send();
}

// Add variable/placeholder next to the cursor.
async function addVariable() {
  return Word.run(async context => {
    // insert text next to cursor.
    const selectedVariable = $("#variables").find(":selected").text();
    context.document.getSelection().insertText("{" + selectedVariable + "}", Word.InsertLocation.end);
    await context.sync();
  });
}

// Writing to the status div.
function updateStatus(message, type) {
  document.getElementById("status").innerHTML = '<div class="alert alert-' + type + ' alert-dismissible fade show" role="alert">' + message + '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button></div>';
}

// Get all of the content from a PowerPoint or Word document in 100-KB chunks of text.
function createDocument(documentType) {
  Office.context.document.getFileAsync("compressed", { sliceSize: 4000000 }, function (result) {
    if (result.status == Office.AsyncResultStatus.Succeeded) {
      // Get the File object from the result.
      const myFile = result.value;
      const state = {
        file: myFile,
        counter: 0,
        sliceCount: myFile.sliceCount,
        type: documentType
      };

      updateStatus("Getting file of " + myFile.size + " bytes", "success");
      getSlice(state);
    } else {
      updateStatus(result.status, "danger");
    }
  });
}

// Get a slice from the file and then call sendSlice.
function getSlice(state) {
  state.file.getSliceAsync(state.counter, function (result) {
    if (result.status == Office.AsyncResultStatus.Succeeded) {
      updateStatus("Sending piece " + (state.counter + 1) + " of " + state.sliceCount, "success");
      sendSlice(result.value, state);
    } else {
      updateStatus(result.status, "danger");
    }
  });
}

// Send the slice to the server via XHR request.
function sendSlice(slice, state) {
  const data = slice.data;

  // If the slice contains data, create an HTTP request.
  if (data) {
    // Encode the slice data, a byte array, as a Base64 string.
    // const fileData = btoa(data);

    // Create a new HTTP request. You need to send the request
    // to a webpage that can receive a post.
    const request = new XMLHttpRequest();

    // Create a handler function to update the status
    // when the request has been sent.
    request.onreadystatechange = function () {
      if (request.readyState == 4) {
        const response = JSON.parse(request.response);
        if (!response.result) {
          updateStatus(response.message, "danger");
        } else {
          updateStatus("Sent " + slice.size + " bytes.", "success");
          state.counter++;
          if (state.counter < state.sliceCount) {
            if (response.filename) {
              state.filename = response.filename;
              updateStatus("file name:" + response.filename, "success");
            } else {
              updateStatus("file not created.", "danger");
            }

            getSlice(state);
          } else {
            closeFile(state);
            $("#saveTemplateToServer")
              .empty()
              .append('Save to Server')
              .prop("disabled", false);
            $("#saveLetterToServer")
              .empty()
              .append('Save to Server')
              .prop("disabled", false);
          }
        }
      }
    };

    let formData = new FormData();
    formData.append("letter_data", data);
    formData.append("max_slice", state.sliceCount);
    formData.append("slice_no", state.counter + 1);

    if (state.type === "template") {
      const selectedTemplateName = $("#templates").find(":selected").val();
      if ($("#templateName").val()) {
        formData.append("letter_name", $("#templateName").val());
      } else {
        formData.append("letter_id", selectedTemplateName);
      }
    } else {
      formData.append("letter_id", $("#letters").find(":selected").val());
      formData.append("case_id", $("#caseId").val());
    }

    if (state.filename) {
      formData.append("file_name", state.filename);
    }

    request.open("POST", window.localStorage.getItem("serverSettings") + "b/system/v3/" + state.type + "/create");
    request.setRequestHeader("authorisation", window.localStorage.getItem("token"));
    request.setRequestHeader("Accept", "application/json, text/plain, */*");

    // Send the file as the body of an HTTP POST
    // request to the web server.
    request.send(formData);
  }
}

// Close the file when you're done with it.
function closeFile(state) {
  state.file.closeAsync(function (result) {
    // If the result returns as a success, the
    // file has been successfully closed.
    if (result.status == "succeeded") {
      // Get the updated list of templates & letters
      getTemplates();
      getLetters();
      updateStatus("File saved to the server successfully.", "success");
    } else {
      updateStatus("File couldn't be saved to the server.", "danger");
    }
  });
}

// Authenticate user.
function authenticate() {
  $("#login")
    .empty()
    .append('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Authenticating...')
    .prop("disabled", true);
  $("#subDomain").prop("disabled", true);
  const request = new XMLHttpRequest();

  request.onreadystatechange = function () {
    if (request.readyState == 4) {
      $("#login")
        .empty()
        .append('Login')
        .prop("disabled", false);
      if (JSON.parse(request.response).result) {
        setAuthenticationToken(JSON.parse(request.response).data);
        location.reload();
        updateUserState();
        updateStatus("Login successful", "success");
      }
      else {
        updateStatus(JSON.parse(request.response).message, "danger");
      }
    }
  };

  let formData = new FormData();
  formData.append("username", $("#username").val());
  formData.append("password", $("#password").val());

  request.open("POST", $("#serverSettings").val() + "b/system/v1/session/login");
  request.setRequestHeader("Accept", "application/json, text/plain, */*");
  request.send(formData);
}

// Set authentication token in local storage.
function setAuthenticationToken(userData) {
  window.localStorage.setItem("token", userData.remote_token);
  window.localStorage.setItem("name", userData.name);
  window.localStorage.setItem("serverSettings", $("#serverSettings").val());
  Office.context.document.settings.saveAsync(function (asyncResult) {
    if (asyncResult.status == Office.AsyncResultStatus.Failed) {
      updateStatus(asyncResult.error.message, "danger");
    } else {
      updateStatus("Settings saved.", "success");
    }
  });
}

// Logout and remove stored data.
function logout() {
  window.localStorage.removeItem("token");
  window.localStorage.removeItem("name");
  window.localStorage.removeItem("serverSettings");
  Office.context.document.settings.saveAsync(function (asyncResult) {
    if (asyncResult.status == Office.AsyncResultStatus.Failed) {
      updateStatus(asyncResult.error.message, "danger");
    } else {
      updateUserState();
      updateStatus("Logout successful.", "success");
    }
  });
}

// Update the elements as per the user state.
function updateUserState() {
  if (window.localStorage.getItem("token")) {
    $("#helloUser").text("Hello " + window.localStorage.getItem("name") + "!");

    $("#mainContent").show();

    $("#formLogin").hide();
    $("#logoutDiv").show();
  } else {
    $("#helloUser").text("");

    $("#mainContent").hide();

    $("#logoutDiv").hide();
    $("#formLogin").show();
  }
}

// Enable/disable login button
function enableDisableButtonLogin() {
  if ($("#serverSettings").val() && $("#username").val() && $("#password").val()) {
    $("#login").prop("disabled", false);
  } else {
    $("#login").prop("disabled", true);
  }
}

// Enable/disable create template button
function enableDisableButtonSaveTemplateToServer() {
  if ($("#fromExistingTemplate").prop("checked") || $("#templateName").val()) {
    $("#saveTemplateToServer").prop("disabled", false);
  } else {
    $("#saveTemplateToServer").prop("disabled", true);
  }
}

// Enable/disable create letter button
function enableDisableButtonSaveLetterToServer() {
  if ($("#caseId").val() && $("#letters").val()) {
    $("#saveLetterToServer").prop("disabled", false);
    $("#loadLetter").prop("disabled", false);
  } else {
    $("#saveLetterToServer").prop("disabled", true);
    $("#loadLetter").prop("disabled", true);
  }
}

// Enable/disable fetch servers button
function enableDisableButtonFetchServers() {
  if ($("#subDomain").val()) {
    $("#fetchServers").prop("disabled", false);
  } else {
    $("#fetchServers").prop("disabled", true);
  }
}

// Load letter from server
async function loadLetter() {
  $("#loadLetter")
    .empty()
    .append('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...')
    .prop("disabled", true);
  return Word.run(async context => {
    const base64Document = await getDocumentAsBase64($("#letters").find(":selected").val(), $("#caseId").val());
    context.document.body.insertFileFromBase64(base64Document, Word.InsertLocation.replace);
    await context.sync();
  });
}

// Load template from server
async function loadTemplate() {
  $("#loadTemplate")
    .empty()
    .append('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...')
    .prop("disabled", true);
  return Word.run(async context => {
    const base64Document = await getDocumentAsBase64($("#templates").find(":selected").val());
    context.document.body.insertFileFromBase64(base64Document, Word.InsertLocation.replace);
    await context.sync();
  });
}

// Get the document in base64 format
function getDocumentAsBase64(documentId, caseId) {
  return new Promise(function (resolve, reject) {
    const request = new XMLHttpRequest();

    request.onreadystatechange = function () {
      if (request.readyState == 4) {
        if (caseId) {
          $("#loadLetter")
            .empty()
            .append('Load')
            .prop("disabled", false);
        } else {
          $("#loadTemplate")
            .empty()
            .append('Load')
            .prop("disabled", false);
        }
        const response = JSON.parse(request.response);
        if (response.result) {
          resolve(response.data);
        } else {
          updateStatus(response.message, "danger");
          reject(request.status);
        }
      }
    }

    let url = window.localStorage.getItem("serverSettings") + "b/system/v3/template/load_template?template_id=" + documentId;
    if (caseId) {
      url = url + "&caseid=" + caseId;
    }
    request.open("GET", url);
    request.setRequestHeader("authorisation", window.localStorage.getItem("token"));
    request.setRequestHeader("Accept", "application/json, text/plain, */*");
    request.send();
  });
}
