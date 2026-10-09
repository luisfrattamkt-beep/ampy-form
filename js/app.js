(function () {
  "use strict";

  var SCREENS = ["opening", "tipo", "desafio", "objetivo", "contato", "obrigado"];
  // índices que contam para a barra de progresso (fora abertura e agradecimento)
  var PROGRESS_STEPS = ["tipo", "desafio", "objetivo", "contato"];

  var state = {
    tipo: "",
    desafio: "",
    objetivo: "",
    nome: "",
    whatsapp: "",
    instagram: ""
  };

  var currentIndex = 0;
  var STORAGE_KEY = "ampy_form_state";

  var screensEl = document.getElementById("screens");
  var screenEls = {};
  SCREENS.forEach(function (name) {
    screenEls[name] = document.querySelector('[data-screen="' + name + '"]');
  });
  var progressWrap = document.getElementById("progressWrap");
  var progressFill = document.getElementById("progressFill");
  var backBtn = document.getElementById("backBtn");

  function restoreState() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        Object.keys(state).forEach(function (k) {
          if (saved[k] !== undefined) state[k] = saved[k];
        });
      }
    } catch (e) { /* ignora, estado some e tudo bem */ }
  }

  function persistState() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* armazenamento indisponível, segue sem persistir */ }
  }

  function applyLogo() {
    if (CONFIG.LOGO_SRC) {
      var logo = document.getElementById("logo");
      logo.innerHTML = "";
      var img = document.createElement("img");
      img.src = CONFIG.LOGO_SRC;
      img.alt = "Ampy";
      logo.appendChild(img);
    }
  }

  function updateProgress(screenName) {
    var stepIndex = PROGRESS_STEPS.indexOf(screenName);
    if (stepIndex === -1) {
      progressWrap.hidden = true;
      return;
    }
    progressWrap.hidden = false;
    var pct = ((stepIndex + 1) / PROGRESS_STEPS.length) * 100;
    progressFill.style.width = pct + "%";
  }

  function showScreen(index, direction) {
    var fromName = SCREENS[currentIndex];
    var toName = SCREENS[index];

    if (fromName && screenEls[fromName]) {
      screenEls[fromName].classList.remove("active");
      screenEls[fromName].classList.remove("leaving-back");
    }

    var toEl = screenEls[toName];
    toEl.classList.remove("leaving-back");
    if (direction === "back") {
      // força reflow para reiniciar a transição na direção certa
      toEl.classList.add("leaving-back");
      void toEl.offsetWidth;
      toEl.classList.remove("leaving-back");
    }
    toEl.classList.add("active");

    currentIndex = index;
    updateProgress(toName);
    backBtn.hidden = (index === 0 || toName === "obrigado");

    var focusTarget = toEl.querySelector("h1, h2");
    if (focusTarget) {
      focusTarget.setAttribute("tabindex", "-1");
      focusTarget.focus({ preventScroll: true });
    }
  }

  function goNext() {
    if (currentIndex < SCREENS.length - 1) {
      showScreen(currentIndex + 1, "forward");
    }
  }

  function goBack() {
    if (currentIndex > 0) {
      showScreen(currentIndex - 1, "back");
    }
  }

  function prefillContactForm() {
    document.getElementById("nomeInput").value = state.nome || "";
    document.getElementById("whatsappInput").value = state.whatsapp || "";
    document.getElementById("instaInput").value = state.instagram || "";
  }

  // ---------- máscara de WhatsApp (00) 00000-0000 ----------
  function maskWhatsapp(value) {
    var digits = value.replace(/\D/g, "").slice(0, 11);
    var out = "";
    if (digits.length > 0) out += "(" + digits.slice(0, 2);
    if (digits.length >= 2) out += ") " + digits.slice(2, 7);
    if (digits.length >= 7) out += "-" + digits.slice(7, 11);
    return out;
  }

  function isValidWhatsapp(value) {
    var digits = value.replace(/\D/g, "");
    return digits.length === 10 || digits.length === 11;
  }

  function digitsOnly(value) {
    return value.replace(/\D/g, "");
  }

  // ---------- eventos ----------
  document.getElementById("startBtn").addEventListener("click", goNext);
  backBtn.addEventListener("click", goBack);

  document.querySelectorAll(".option").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var field = btn.getAttribute("data-field");
      var value = btn.getAttribute("data-value");
      state[field] = value;
      persistState();

      var siblings = btn.parentElement.querySelectorAll(".option");
      siblings.forEach(function (s) { s.classList.remove("selected"); });
      btn.classList.add("selected");

      window.setTimeout(function () {
        if (currentIndex + 1 < SCREENS.length && SCREENS[currentIndex + 1] === "contato") {
          prefillContactForm();
        }
        goNext();
      }, 180);
    });
  });

  var whatsappInput = document.getElementById("whatsappInput");
  whatsappInput.addEventListener("input", function () {
    whatsappInput.value = maskWhatsapp(whatsappInput.value);
  });

  var form = document.getElementById("contactForm");
  var submitBtn = document.getElementById("submitBtn");
  var submitError = document.getElementById("submitError");
  var retryBtn = document.getElementById("retryBtn");
  var nomeError = document.getElementById("nomeError");
  var whatsappError = document.getElementById("whatsappError");

  function validateForm() {
    var nomeInput = document.getElementById("nomeInput");
    var ok = true;

    if (!nomeInput.value.trim()) {
      nomeInput.classList.add("invalid");
      nomeError.hidden = false;
      ok = false;
    } else {
      nomeInput.classList.remove("invalid");
      nomeError.hidden = true;
    }

    if (!isValidWhatsapp(whatsappInput.value)) {
      whatsappInput.classList.add("invalid");
      whatsappError.hidden = false;
      ok = false;
    } else {
      whatsappInput.classList.remove("invalid");
      whatsappError.hidden = true;
    }

    return ok;
  }

  function buildWhatsappLink() {
    var msg = "Oi! Me chamo " + state.nome + ".\n" +
      "Preenchi o formulário da Ampy:\n" +
      "- Perfil: " + state.tipo + "\n" +
      "- Trava: " + state.desafio + "\n" +
      "- Quero: " + state.objetivo;
    return "https://wa.me/" + CONFIG.WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg);
  }

  function submitToSheet() {
    var body = new URLSearchParams();
    body.append("nome", state.nome);
    body.append("whatsapp", state.whatsapp);
    body.append("instagram", state.instagram);
    body.append("tipo", state.tipo);
    body.append("desafio", state.desafio);
    body.append("objetivo", state.objetivo);

    return fetch(CONFIG.GAS_URL, {
      method: "POST",
      body: body
    }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    }).then(function (data) {
      if (!data || data.result !== "success") {
        throw new Error("Resposta inesperada do servidor");
      }
      return data;
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    state.nome = document.getElementById("nomeInput").value.trim();
    state.whatsapp = digitsOnly(whatsappInput.value);
    var insta = document.getElementById("instaInput").value.trim();
    if (insta && insta.charAt(0) !== "@") insta = "@" + insta;
    state.instagram = insta;
    persistState();

    if (!validateForm()) return;

    submitError.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    submitToSheet()
      .then(function () {
        document.getElementById("whatsappLink").href = buildWhatsappLink();
        goNext();
      })
      .catch(function () {
        submitError.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = "Enviar";
      });
  });

  retryBtn.addEventListener("click", function () {
    form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { cancelable: true }));
  });

  // ---------- início ----------
  restoreState();
  applyLogo();
  updateProgress(SCREENS[0]);
})();
