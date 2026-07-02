const CARD_OPTIONS = [1, 2, 4, 8, 16, 32, 64];
const NUMBERS_PER_CARD = 7;
const MIN_NUMBER = 10;
const MAX_NUMBER = 99;
const KARO_REVEAL_STEPS = [5, 6, 7, 8, 9, 1, 1, 1, 1];
const SHOWCASE_ROW_COUNTS = KARO_REVEAL_STEPS;
const DRAW_BALL_COUNT = SHOWCASE_ROW_COUNTS.reduce((total, rowCount) => total + rowCount, 0);
const TOMBALA_NUMBER_CELLS = [5, 7, 9, 1, 3, 11, 13];
const TOMBALA_CARD_COUNTS = [1, 2, 4, 8, 16];

let cardSlider = document.querySelector("#cardSlider");
let selectedCount = document.querySelector("#selectedCount");
let createCardsButton = document.querySelector("#createCardsButton");
const drawButton = document.querySelector("#drawButton");
const rowDrawButton = document.querySelector("#rowDrawButton");
const roundActions = document.querySelector("#roundActions");
const cardsGrid = document.querySelector("#cardsGrid");
const sliderPanel = document.querySelector(".slider-panel");
const topbar = document.querySelector(".topbar");
const openHowPanel = document.querySelector("#openHowPanel");
const languageButton = document.querySelector("#languageButton");
const howPanel = document.querySelector("#howPanel");
const homeShowcase = document.querySelector("#homeShowcase");
const initialSliderPanelContent = sliderPanel.innerHTML;
let hasDrawnNumbers = false;
let currentDrawNumbers = [];
let currentDrawNumberSet = new Set();
let lastCardCount = 1;
let visibleDrawRows = 0;
let revealedBallCount = 0;
let topbarModeTimer;
let languageButtonTimer;

function setTopbarGameMode(isGameMode) {
  const currentGameMode = topbar.classList.contains("is-game-topbar");
  const nextLabel = isGameMode ? "" : "Nasıl Oynanır ?";
  const currentLabel = openHowPanel.querySelector(".menu-button-label");

  window.clearTimeout(topbarModeTimer);
  openHowPanel.setAttribute("aria-label", isGameMode ? "Ana menüye dön" : "Nasıl Oynanır");
  openHowPanel.setAttribute("aria-expanded", "false");

  if (currentGameMode === isGameMode && currentLabel?.textContent === nextLabel) {
    return;
  }

  openHowPanel.classList.add("is-menu-switching-out");

  topbarModeTimer = window.setTimeout(() => {
    topbar.classList.toggle("is-game-topbar", isGameMode);
    openHowPanel.innerHTML = `<span class="menu-button-label">${nextLabel}</span>`;
    openHowPanel.classList.remove("is-menu-switching-out");
    openHowPanel.classList.add("is-menu-switching-in");

    window.setTimeout(() => {
      openHowPanel.classList.remove("is-menu-switching-in");
    }, 360);
  }, 180);
}

function getSelectedCardCount() {
  return CARD_OPTIONS[Number(cardSlider.value)];
}

function updateSelectedCount() {
  if (selectedCount) {
    selectedCount.textContent = getSelectedCardCount();
  }

  cardSlider.style.setProperty("--slider-percent", `${(Number(cardSlider.value) / (CARD_OPTIONS.length - 1)) * 100}%`);
}

function pickUniqueNumbers(amount, minNumber, maxNumber) {
  const numbers = [];

  while (numbers.length < amount) {
    const candidate = Math.floor(Math.random() * (maxNumber - minNumber + 1)) + minNumber;

    if (!numbers.includes(candidate)) {
      numbers.push(candidate);
    }
  }

  return numbers;
}

function createCard(useTombalaLayout = false) {
  const card = document.createElement("article");
  card.className = useTombalaLayout ? "card generated-card tombala-card" : "card generated-card";

  const numberList = document.createElement("div");
  numberList.className = useTombalaLayout ? "number-list tombala-number-list" : "number-list";

  const numbers = pickUniqueNumbers(NUMBERS_PER_CARD, MIN_NUMBER, MAX_NUMBER);
  card.dataset.originalNumbers = numbers.join(",");

  if (useTombalaLayout) {
    renderTombalaCardNumbers(numberList, numbers);
  } else {
    renderCardNumbers(numberList, numbers);
  }
  card.append(numberList);

  return card;
}

function createRaffleBall(number, index, extraClass = "") {
  const ball = document.createElement("span");
  const label = document.createElement("span");
  const seed = (number * 17 + index * 31) % 100;
  const shineX = 18 + (seed % 22);
  const shineY = 14 + ((seed * 3) % 20);
  const scale = 0.94 + ((seed % 9) * 0.012);
  const rotate = -7 + (seed % 15);
  const textRotate = -rotate;
  const brightness = 0.92 + ((seed % 13) * 0.012);

  ball.className = `raffle-ball ${extraClass}`.trim();
  ball.dataset.number = number;
  ball.style.setProperty("--shine-x", `${shineX}%`);
  ball.style.setProperty("--shine-y", `${shineY}%`);
  ball.style.setProperty("--scale", scale.toFixed(3));
  ball.style.setProperty("--rotate", `${rotate}deg`);
  ball.style.setProperty("--text-rotate", `${textRotate}deg`);
  ball.style.setProperty("--brightness", brightness.toFixed(3));

  label.textContent = number;
  ball.append(label);

  return ball;
}

function createCardNumberLabel(number, index) {
  const numberPill = document.createElement("span");
  const label = document.createElement("span");

  numberPill.className = "number-pill";
  numberPill.dataset.number = number;
  numberPill.style.setProperty("--number-delay", `${index * 90}ms`);
  label.textContent = number;
  numberPill.append(label);

  return numberPill;
}

function renderCardNumbers(numberList, numbers) {
  const fragment = document.createDocumentFragment();

  numberList.replaceChildren();

  numbers.forEach((number, numberIndex) => {
    fragment.append(createCardNumberLabel(number, numberIndex));
  });

  numberList.append(fragment);
}

function renderTombalaCardNumbers(numberList, numbers) {
  const fragment = document.createDocumentFragment();
  let numberIndex = 0;

  numberList.replaceChildren();

  for (let cellIndex = 0; cellIndex < 15; cellIndex += 1) {
    const cell = document.createElement("span");
    cell.className = "tombala-cell";

    if (TOMBALA_NUMBER_CELLS.includes(cellIndex)) {
      cell.append(createCardNumberLabel(numbers[numberIndex], numberIndex));
      numberIndex += 1;
    }

    fragment.append(cell);
  }

  numberList.append(fragment);
}

function renderShowcaseBalls(numbers, revealedCount = 0) {
  const glass = homeShowcase.querySelector(".showcase-glass");
  const fragment = document.createDocumentFragment();
  let numberIndex = 0;

  glass.replaceChildren();

  SHOWCASE_ROW_COUNTS.forEach((rowCount) => {
    const row = document.createElement("div");
    row.className = "showcase-row";

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const number = numbers[numberIndex];
      const revealClass = numberIndex < revealedCount ? " is-revealed" : "";
      const showcaseBall = createRaffleBall(number, numberIndex, `showcase-ball${revealClass}`);

      showcaseBall.style.setProperty("--ball-delay", `${getKaroRevealOrder(numberIndex) * 34}ms`);
      showcaseBall.style.setProperty("--number-delay", `${numberIndex * 18}ms`);
      row.append(showcaseBall);
      numberIndex += 1;
    }

    fragment.append(row);
  });

  glass.append(fragment);
}

function renderHomeShowcase() {
  renderShowcaseBalls(pickUniqueNumbers(DRAW_BALL_COUNT, MIN_NUMBER, MAX_NUMBER), 0);
}

function getKaroRevealOrder(index) {
  return index;
}

function updateShowcaseNumbers(numbers) {
  const showcaseBalls = homeShowcase.querySelectorAll(".showcase-ball");

  showcaseBalls.forEach((ball, index) => {
    const label = ball.querySelector("span");
    const number = numbers[index];

    ball.dataset.number = number;
    ball.style.setProperty("--number-delay", `${getKaroRevealOrder(index) * 34}ms`);
    label.textContent = number;
  });
}

function revealShowcaseNumbers(revealedCount) {
  const showcaseBalls = homeShowcase.querySelectorAll(".showcase-ball");

  showcaseBalls.forEach((ball, index) => {
    ball.classList.toggle("is-revealed", getKaroRevealOrder(index) < revealedCount);
  });
}

function hideShowcaseNumbers() {
  const showcaseBalls = homeShowcase.querySelectorAll(".showcase-ball");

  showcaseBalls.forEach((ball) => {
    ball.classList.remove("is-revealed");
  });
}

function getRevealedDrawNumbers(numbers, revealedCount) {
  return numbers.filter((number, index) => getKaroRevealOrder(index) < revealedCount);
}

function getRevealedDrawOrderMap(numbers, revealedCount) {
  const revealedOrderMap = new Map();

  numbers.forEach((number, index) => {
    const revealOrder = getKaroRevealOrder(index);

    if (revealOrder < revealedCount) {
      revealedOrderMap.set(number, revealOrder);
    }
  });

  return revealedOrderMap;
}

function markPreviewMatchedNumbers(numbers, revealedCount) {
  const revealedOrderMap = getRevealedDrawOrderMap(numbers, revealedCount);
  const cards = sliderPanel.querySelectorAll(".card");

  cards.forEach((card) => {
    const numberPills = [...card.querySelectorAll(".number-pill")];
    let previewMatchCount = 0;
    const previewMatchOrders = [];

    numberPills.forEach((numberPill) => {
      const number = Number(numberPill.dataset.number);
      const isPreviewMatch = revealedOrderMap.has(number);

      numberPill.classList.toggle("is-preview-match", isPreviewMatch);
      numberPill.classList.remove("is-matched-number");

      if (isPreviewMatch) {
        const revealOrder = revealedOrderMap.get(number);
        numberPill.style.setProperty("--match-delay", `${revealOrder * 34 + 160}ms`);
        previewMatchOrders.push(revealOrder);
        previewMatchCount += 1;
      }
    });

    card.classList.remove("is-preview-five-match-card", "is-preview-six-match-card", "is-preview-jackpot-card");
    previewMatchOrders.sort((first, second) => first - second);

    if (previewMatchCount >= 5) {
      const prizeIndex = Math.min(previewMatchCount, 7) - 1;
      const prizeDelay = previewMatchOrders[prizeIndex] * 34 + 520;
      card.style.setProperty("--prize-delay", `${prizeDelay}ms`);
    } else {
      card.style.setProperty("--prize-delay", "0ms");
    }

    if (previewMatchCount >= 7) {
      card.classList.add("is-preview-jackpot-card");
    } else if (previewMatchCount === 6) {
      card.classList.add("is-preview-six-match-card");
    } else if (previewMatchCount === 5) {
      card.classList.add("is-preview-five-match-card");
    }

    if (previewMatchCount >= 5) {
      let winMatchIndex = 0;

      numberPills.forEach((numberPill) => {
        if (numberPill.classList.contains("is-preview-match")) {
          numberPill.style.setProperty("--win-delay", `${500 + winMatchIndex * 55}ms`);
          numberPill.classList.add("is-matched-number");
          winMatchIndex += 1;
        }
      });
    }
  });
}

function renderSingleCardInSliderPlace() {
  renderCardsInSliderPlace(getSelectedCardCount());
}

function renderCardsInSliderPlace(cardCount) {
  lastCardCount = cardCount;

  const resultGrid = document.createElement("div");
  resultGrid.className = `card-result-grid card-result-grid-${cardCount}`;

  if (cardCount === 1) {
    resultGrid.append(createCard(TOMBALA_CARD_COUNTS.includes(cardCount)));
  } else {
    const leftCards = document.createElement("div");
    const rightCards = document.createElement("div");
    const splitIndex = Math.ceil(cardCount / 2);

    resultGrid.classList.add("split-card-grid");
    leftCards.className = "card-result-side card-result-side-left";
    rightCards.className = "card-result-side card-result-side-right";

    for (let index = 0; index < cardCount; index += 1) {
      const card = createCard(TOMBALA_CARD_COUNTS.includes(cardCount));

      if (index < splitIndex) {
        leftCards.append(card);
      } else {
        rightCards.append(card);
      }
    }

    resultGrid.append(leftCards, rightCards);
  }

  sliderPanel.replaceChildren(resultGrid);
  sliderPanel.classList.remove("is-leaving");
  sliderPanel.classList.add("is-card-result");
  sliderPanel.dataset.cardCount = cardCount;
  homeShowcase.classList.add("is-game-showcase");
  topbar.classList.remove("is-hidden");
  setTopbarGameMode(true);
  closePanel("how");
  cardsGrid.className = "cards-grid";
  cardsGrid.replaceChildren();
  revealedBallCount = 0;
  roundActions.classList.remove("is-hidden");
  drawButton.disabled = false;
  rowDrawButton.disabled = false;
  rowDrawButton.classList.remove("is-hidden");
  drawButton.textContent = "Tüm Topları Görüntüle";
  drawButton.title = "";
  sortCardNumbers();
}

function createCardsWithTransition() {
  const cardCount = getSelectedCardCount();

  createCardsButton.disabled = true;
  cardSlider.disabled = true;
  sliderPanel.classList.add("is-leaving");

  window.setTimeout(() => {
    renderCardsInSliderPlace(cardCount);
  }, 360);
}

function bindCardSelectionControls() {
  cardSlider = document.querySelector("#cardSlider");
  selectedCount = document.querySelector("#selectedCount");
  createCardsButton = document.querySelector("#createCardsButton");

  cardSlider.addEventListener("input", updateSelectedCount);
  createCardsButton.addEventListener("click", createCardsWithTransition);
  updateSelectedCount();
}

function restoreCardSelection() {
  sliderPanel.classList.remove("is-card-result", "is-leaving");
  sliderPanel.removeAttribute("data-card-count");
  sliderPanel.innerHTML = initialSliderPanelContent;
  topbar.classList.remove("is-hidden");
  setTopbarGameMode(false);
  homeShowcase.classList.remove("is-hidden", "is-game-showcase");
  roundActions.classList.add("is-hidden");
  drawButton.disabled = true;
  rowDrawButton.disabled = true;
  rowDrawButton.classList.remove("is-hidden");
  drawButton.textContent = "Tüm Topları Görüntüle";
  hasDrawnNumbers = false;
  currentDrawNumbers = [];
  currentDrawNumberSet = new Set();
  visibleDrawRows = 0;
  revealedBallCount = 0;
  cardsGrid.replaceChildren();
  cardsGrid.className = "cards-grid";
  renderHomeShowcase();
  bindCardSelectionControls();
}

function openPanel(panelName) {
  const panel = howPanel;
  const button = openHowPanel;

  panel.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");
  button.setAttribute("aria-expanded", "true");
}

function closePanel(panelName) {
  const panel = howPanel;
  const button = openHowPanel;

  panel.classList.remove("is-open");
  panel.setAttribute("aria-hidden", "true");
  button.setAttribute("aria-expanded", "false");
}

function getSortedCardNumbers(numbers) {
  return numbers;
}

function sortCardNumbers() {
  const cards = sliderPanel.querySelectorAll(".card");

  cards.forEach((card) => {
    const originalNumbers = card.dataset.originalNumbers
      .split(",")
      .map((number) => Number(number));
    const numberList = card.querySelector(".number-list");

    if (card.classList.contains("tombala-card")) {
      renderTombalaCardNumbers(numberList, getSortedCardNumbers(originalNumbers));
    } else {
      renderCardNumbers(numberList, getSortedCardNumbers(originalNumbers));
    }
  });

  if (hasDrawnNumbers) {
    markFullyMatchedCards(currentDrawNumbers);
  }
}

function markFullyMatchedCards(drawNumbers) {
  const drawnNumberSet = new Set(drawNumbers);
  currentDrawNumberSet = drawnNumberSet;
  const cards = sliderPanel.querySelectorAll(".card");

  cards.forEach((card) => {
    const numberPills = [...card.querySelectorAll(".number-pill")];
    const cardNumbers = numberPills.map((numberPill) => Number(numberPill.dataset.number));
    const matchCount = cardNumbers.filter((number) => drawnNumberSet.has(number)).length;

    card.classList.remove(
      "is-preview-five-match-card",
      "is-preview-six-match-card",
      "is-preview-jackpot-card",
      "is-five-match-card",
      "is-six-match-card",
      "is-jackpot-card"
    );
    numberPills.forEach((numberPill) => numberPill.classList.remove("is-matched-number"));

    if (matchCount === 7) {
      card.classList.add("is-jackpot-card");
    } else if (matchCount === 6) {
      card.classList.add("is-six-match-card");
    } else if (matchCount === 5) {
      card.classList.add("is-five-match-card");
    }

    if (matchCount >= 5) {
      numberPills.forEach((numberPill) => {
        const number = Number(numberPill.dataset.number);

        if (drawnNumberSet.has(number)) {
          numberPill.classList.add("is-matched-number");
        }
      });
    }
  });
}

function renderDrawShowcase(numbers, revealedCount) {
  cardsGrid.className = "cards-grid";
  cardsGrid.replaceChildren();
  updateShowcaseNumbers(numbers);
  revealShowcaseNumbers(revealedCount);
  markPreviewMatchedNumbers(numbers, revealedCount);

  if (hasDrawnNumbers) {
    markFullyMatchedCards(currentDrawNumbers);
  }
}

function prepareDrawNumbers() {
  if (currentDrawNumbers.length > 0) {
    return;
  }

  currentDrawNumbers = pickUniqueNumbers(DRAW_BALL_COUNT, MIN_NUMBER, MAX_NUMBER);
  updateShowcaseNumbers(currentDrawNumbers);
}

function completeDrawView() {
  markFullyMatchedCards(currentDrawNumbers);
  hasDrawnNumbers = true;
  drawButton.textContent = "Tekrar Dene";
  drawButton.disabled = false;
  rowDrawButton.disabled = true;
  rowDrawButton.classList.add("is-hidden");
}

function renderDrawNumbers() {
  prepareDrawNumbers();
  visibleDrawRows = KARO_REVEAL_STEPS.length;
  revealedBallCount = DRAW_BALL_COUNT;

  renderDrawShowcase(currentDrawNumbers, DRAW_BALL_COUNT);
  completeDrawView();
}

function renderNextDrawRow() {
  prepareDrawNumbers();
  const stepAmount = KARO_REVEAL_STEPS[visibleDrawRows] ?? 0;
  visibleDrawRows = Math.min(visibleDrawRows + 1, KARO_REVEAL_STEPS.length);
  revealedBallCount = Math.min(revealedBallCount + stepAmount, DRAW_BALL_COUNT);

  renderDrawShowcase(currentDrawNumbers, revealedBallCount);

  if (visibleDrawRows === KARO_REVEAL_STEPS.length) {
    completeDrawView();
  }
}

function resetGame() {
  hasDrawnNumbers = false;
  currentDrawNumbers = [];
  currentDrawNumberSet = new Set();
  visibleDrawRows = 0;
  revealedBallCount = 0;
  hideShowcaseNumbers();
  cardsGrid.replaceChildren();
  cardsGrid.className = "cards-grid";
  renderCardsInSliderPlace(lastCardCount);
}

bindCardSelectionControls();
renderHomeShowcase();

openHowPanel.addEventListener("click", () => {
  if (topbar.classList.contains("is-game-topbar")) {
    restoreCardSelection();
    return;
  }

  openPanel("how");
});

languageButton.addEventListener("click", () => {
  const nextLanguage = languageButton.dataset.language === "tr" ? "en" : "tr";

  window.clearTimeout(languageButtonTimer);
  languageButton.classList.add("is-language-switching");
  languageButton.dataset.language = nextLanguage;
  languageButton.textContent = nextLanguage === "tr" ? "TR" : "ENG";

  languageButtonTimer = window.setTimeout(() => {
    languageButton.classList.remove("is-language-switching");
  }, 260);
});

document.querySelectorAll("[data-close-panel]").forEach((button) => {
  button.addEventListener("click", () => closePanel(button.dataset.closePanel));
});

drawButton.addEventListener("click", () => {
  if (hasDrawnNumbers) {
    resetGame();
    return;
  }

  renderDrawNumbers();
});

rowDrawButton.addEventListener("click", renderNextDrawRow);
