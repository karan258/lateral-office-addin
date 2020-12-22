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

    enableDisableLoginButton();
    enableDisableCreateTemplateButton();
    enableDisableCreateLetterButton();
    updateUserState();

    getTemplates();
    getLetters();
    getVariables();

    document.getElementById("addVariable").onclick = addVariable;
    document.getElementById("login").onclick = authenticate;
    document.getElementById("logout").onclick = logout;
    document.getElementById("fetchAPIs").onclick = fetchAPIs;

    $("#createTemplate").click(function () {
      createDocument("template");
    });
    $("#createLetter").click(function () {
      createDocument("letter");
    });

    $("#templates").change(function () {
      enableDisableCreateTemplateButton();
      if (this.value !== "New") {
        $("#templateName").val("");
        $("#templateName").hide();
      } else {
        $("#templateName").show();
      }
    });

    $("#letters").change(function () {
      enableDisableCreateLetterButton();
    });

    $("#serverSettings").change(function () {
      enableDisableLoginButton();
    });

    $("#templateName").blur(function () {
      enableDisableCreateTemplateButton();
    });

    $("#caseId").blur(function () {
      enableDisableCreateLetterButton();
    });

    $("#username").blur(function () {
      enableDisableLoginButton();
    });

    $("#password").blur(function () {
      enableDisableLoginButton();
    });
  }
});

// Fetch templates from backend.
function getTemplates() {
  $("#templates").prop("disabled", true);
  $("#templates").css("background-size", "auto");
  const request = new XMLHttpRequest();

  request.onreadystatechange = function () {
    if (request.readyState == 4) {
      $("#templates").prop("disabled", false);
      $("#templates").css("background-size", "0%");
      for (const [key, value] of Object.entries(JSON.parse(request.response).data)) {
        $("#templates").append('<option value="' + key + '">' + value + "</option>");
      }
    }
  };

  request.open("GET", Office.context.document.settings.get("serverSettings") + "b/system/v3/letter/get_letter_details");
  request.setRequestHeader("authorisation", Office.context.document.settings.get("token"));
  request.setRequestHeader("Accept", "application/json, text/plain, */*");
  request.send();
}

// Fetch letters from backend.
function getLetters() {
  $("#letters").prop("disabled", true);
  $("#letters").css("background-size", "auto");
  const request = new XMLHttpRequest();

  request.onreadystatechange = function () {
    if (request.readyState == 4) {
      $("#letters").prop("disabled", false);
      $("#letters").css("background-size", "0%");
      for (const [key, value] of Object.entries(JSON.parse(request.response).data)) {
        $("#letters").append('<option value="' + key + '">' + value + "</option>");
      }
    }
  };

  request.open("GET", Office.context.document.settings.get("serverSettings") + "b/system/v3/letter/get_letter_details");
  request.setRequestHeader("authorisation", Office.context.document.settings.get("token"));
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
      $("#variables").prop("disabled", false);
      $("#variables").css("background-size", "0%");
      for (const [key, value] of Object.entries(JSON.parse(request.response).data.letter_variables_list)) {
        $("#variables").append('<option value="' + key + '">' + value + "</option>");
      }
    }
  };

  request.open("GET", Office.context.document.settings.get("serverSettings") + "b/system/v3/letter/get_variable_list");
  request.setRequestHeader("authorisation", Office.context.document.settings.get("token"));
  request.setRequestHeader("Accept", "application/json, text/plain, */*");
  request.send();
}

// Fetch the list of available APIs from backend.
function fetchAPIs() {
  $("#fetchAPIs").prop("disabled", true);
  $("#subDomain").prop("disabled", true);
  $("#serverSettings").css("background-size", "auto");
  const request = new XMLHttpRequest();

  request.onreadystatechange = function () {
    if (request.readyState == 4) {
      $("#fetchAPIs").prop("disabled", false);
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
export async function addVariable() {
  return Word.run(async context => {
    // insert text next to cursor.
    const selectedVariable = $("#variables").find(":selected").text();
    const paragraph = context.document.getSelection().insertText("{" + selectedVariable + "}", Word.InsertLocation.end);

    // change the paragraph color to blue.
    paragraph.font.color = "blue";

    await context.sync();
  });
}

// Writing to the status div.
function updateStatus(message, type) {
  document.getElementById("status").innerHTML = '<div class="alert alert-' + type + ' alert-dismissible fade show" role="alert">' + message + '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button></div>';
}

// Get all of the content from a PowerPoint or Word document in 100-KB chunks of text.
function createDocument(documentType) {
  $("#createTemplate").prop("disabled", true);
  $("#createLetter").prop("disabled", true);
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
        updateStatus("Sent " + slice.size + " bytes.", "success");
        state.counter++;
        if (state.counter < state.sliceCount) {
          if (JSON.parse(request.response).filename) {
            state.filename = JSON.parse(request.response).filename;
            updateStatus("file name:" + JSON.parse(request.response).filename, "success");
          } else {
            updateStatus("file not created.", "danger");
          }

          getSlice(state);
        } else {
          closeFile(state);
          $("#createTemplate").prop("disabled", false);
          $("#createLetter").prop("disabled", false);
        }
      }
    };

    let formData = new FormData();
    formData.append("letter_data", data);
    formData.append("max_slice", state.sliceCount);
    formData.append("slice_no", state.counter + 1);

    if (state.type === "template") {
      const selectedTemplateName = $("#templates")
        .find(":selected")
        .val();
      if (selectedTemplateName === "New") {
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

    request.open("POST", Office.context.document.settings.get("serverSettings") + "b/system/v3/" + state.type + "/create");
    request.setRequestHeader("authorisation", Office.context.document.settings.get("token"));
    request.setRequestHeader("Accept", "application/json, text/plain, */*");

    // Send the file as the body of an HTTP POST
    // request to the web server.
    request.send(formData);
  }
}

// Close file.
function closeFile(state) {
  // Close the file when you're done with it.
  state.file.closeAsync(function (result) {
    // If the result returns as a success, the
    // file has been successfully closed.
    if (result.status == "succeeded") {
      updateStatus("File sent successfully.", "success");
    } else {
      updateStatus("File couldn't be sent.", "danger");
    }
  });
}

// Authenticate user.
function authenticate() {
  $("#login").prop("disabled", true);
  const request = new XMLHttpRequest();

  request.onreadystatechange = function () {
    if (request.readyState == 4) {
      $("#login").prop("disabled", false);
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
  Office.context.document.settings.set("serverSettings", $("#serverSettings").val());
  Office.context.document.settings.set("token", userData.remote_token);
  Office.context.document.settings.set("name", userData.name);
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
  Office.context.document.settings.remove("token");
  Office.context.document.settings.remove("name");
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
  if (Office.context.document.settings.get("token")) {
    $("#helloUser").text("Hello " + Office.context.document.settings.get("name") + "!");

    $("#templatesForm").show();
    $("#templatesLabel").hide();

    $("#lettersForm").show();
    $("#lettersLabel").hide();

    $("#variablesForm").show();
    $("#variablesLabel").hide();

    $("#formLogin").hide();
    $("#logout").show();
  } else {
    $("#helloUser").text("");

    $("#templatesForm").hide();
    $("#templatesLabel").show();

    $("#lettersForm").hide();
    $("#lettersLabel").show();

    $("#variablesForm").hide();
    $("#variablesLabel").show();

    $("#logout").hide();
    $("#formLogin").show();
  }
}

function enableDisableLoginButton() {
  if ($("#serverSettings").val() && $("#username").val() && $("#password").val()) {
    $("#login").prop("disabled", false);
  } else {
    $("#login").prop("disabled", true);
  }
}

function enableDisableCreateTemplateButton() {
  if (($("#templates").val() !== "New") || ($("#templates").val() && $("#templateName").val())) {
    $("#createTemplate").prop("disabled", false);
  } else {
    $("#createTemplate").prop("disabled", true);
  }
}

function enableDisableCreateLetterButton() {
  if ($("#caseId").val() && $("#letters").val()) {
    $("#createLetter").prop("disabled", false);
  } else {
    $("#createLetter").prop("disabled", true);
  }
}
