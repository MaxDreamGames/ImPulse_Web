setInterval(() => checkAll(), 500);

document.getElementById("usertag").addEventListener("input", function () {
    const el = this;
    const value = el.value;
    const errorMsg = document.getElementById("errorMsg");
    fetch(`/Registration/CheckUniquenessUsertag?usertag=${encodeURIComponent(value)}`)
        .then(response => response.json())
        .then(isUnique => {
            if (value.length > 0) {
                console.log(typeof value);
                if (isUnique && checkUserTag(value) && value.length >= 5) {
                    errorMsg.style.display = "block";
                    errorMsg.style.color = "#4ef242";
                    errorMsg.textContent = "Username is available";
                } else {
                    errorMsg.style = "";
                    errorMsg.style.display = "block";
                    errorMsg.style.color = "#f24242;";
                    if (isUnique && !checkUserTag(value) || value.length < 5) {
                        errorMsg.textContent = "Usertag is not valid";
                    } else if (!isUnique) {
                        errorMsg.textContent = "Usertag already taken. Please choose a different one";
                    }
                }
            } else {
                errorMsg.style.display = "none";
            }
        });
});

document.getElementById("pass-input").addEventListener("input", function () {
    const el = this;
    const value = el.value;
    const errorMsg = document.getElementById("errorPassMsg");
    const submitButton = document.getElementsByClassName("submit-button")[0];
    const confirmErrorMsg = document.getElementById("errorConfirmPassMsg");
    const confirmPassValue = document.getElementById("confirm-pass-input").value;

    if (checkPassword(value)) {
        errorMsg.style.display = "block";
        errorMsg.style.color = "#4ef242";
        errorMsg.textContent = "Password is correct and quite strong";
    }
    else {
        errorMsg.style.display = "block";
        errorMsg.style.color = "#f24242";
        errorMsg.textContent = "Password is not following the password's rules or too week";
    }

    if (checkConfirmPassword(value, confirmPassValue)) {
        confirmErrorMsg.style.display = "block";
        confirmErrorMsg.style.color = "#4ef242";
        confirmErrorMsg.textContent = "The passwords do match";
    }
    else {
        confirmErrorMsg.style.display = "block";
        confirmErrorMsg.style.color = "#f24242";
        confirmErrorMsg.textContent = "The passwords do not match";
    }
});

document.getElementById("confirm-pass-input").addEventListener("input", function (e) {
    const value = this.value;
    const errorMsg = document.getElementById("errorConfirmPassMsg");
    const passValue = document.getElementById("pass-input").value;

    if (checkConfirmPassword(passValue, value)) {
        errorMsg.style.display = "block";
        errorMsg.style.color = "#4ef242";
        errorMsg.textContent = "The passwords do match";
    }
    else {
        errorMsg.style.display = "block";
        errorMsg.style.color = "#f24242";
        errorMsg.textContent = "The passwords do not match";
    }
});

const observer = new MutationObserver(() => {
    const passLabel = document.getElementById('pass-label');
    if (passLabel) {
        const htmlEl = document.getElementsByTagName('html')[0];
        if (htmlEl.getAttribute('lang') === 'ru') {
            passLabel.setAttribute('tooltip', "Пароль должен соответствовать следующим требованиям: не менее 6 символов; не более 128 символов; Только латинские буквы; может содержать заголовок и строчные буквы; хотя бы одна цифра; без пробелов;  Допустимые символы: ~ ! ? # $ % ^ & * _ - + () [] {} > < / | : ;");
        }
        else {
            passLabel.setAttribute('tooltip', "The password must comply with the following requirements: at least 6 characters; no more than 128 characters; Only Latin letters; may contain title and lowercase letters; at least one digit; without gaps;  Permissible symbols: ~ ! ? # $ % ^ & * _ - + () [] {} > < / | : ;");
        }
    }
});

observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

function checkUserTag(usertag) {
    const regex = /^[a-z0-9\-_]+$/;
    return regex.test(usertag);
}

function checkPassword(password) {
    const regex = /^(?=.*[0-9])[A-Za-z0-9~!?#$%^&*_\-+()\[\]{}><\/|:;]{6,128}$/;
    const regex1 = /[a-zA-Z]/;
    return regex.test(password) && regex1.test(password);
}

function checkConfirmPassword(password, confirmPassword) {
    if (password == '') return false;
    return confirmPassword === password
}

function checkAll() {
    const usernameIsValid = document.getElementById('username').value.length > 0;
    const usertagIsValid = document.getElementById('errorMsg').style.color === 'rgb(78, 242, 66)';
    const passwordIsValid = checkPassword(document.getElementById('pass-input').value);
    const confirmPasswordIsValid = checkConfirmPassword(document.getElementById('pass-input').value, document.getElementById('confirm-pass-input').value);
    if (usernameIsValid && usertagIsValid && passwordIsValid && confirmPasswordIsValid)
        document.getElementsByClassName("submit-button")[0].removeAttribute('disabled');
    else
        document.getElementsByClassName("submit-button")[0].setAttribute('disabled', 'disabled');
}