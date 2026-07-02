const CARD_OPTIONS = [1, 2, 4, 8, 16, 32, 64];
const NUMBERS_PER_CARD = 7;
const MIN_NUMBER = 10;
const MAX_NUMBER = 99;
const KARO_REVEAL_STEPS = [6, 9, 6, 7, 6, 9, 5, 1];

let cardSlider = document.querySelector("#cardSlider");
let selectedCount = document.querySelector("#selectedCount");
let createCardsButton = document.querySelector("#createCardsButton");
const drawButton = document.querySelector("#drawButton");
const rowDrawButton = document.querySelector("#rowDrawButton");
const roundActions = document.querySelector("#roundActions");
const mainMenuButton = document.querySelector("#mainMenuButton");
const cardsGrid = document.querySelector("#cardsGrid");
const cardSortSelect = document.querySelector("#cardSortSelect");
const sliderPanel = document.querySelector(".slider-panel");
const topbar = document.querySelector(".topbar");
const openHowPanel = document.querySelector("#openHowPanel");
const openSettingsPanel = document.querySelector("#openSettingsPanel");
const howPanel = document.querySelector("#howPanel");
const settingsPanel = document.querySelector("#settingsPanel");
const homeShowcase = document.querySelector("#homeShowcase");
const initialSliderPanelContent = sliderPanel.innerHTML;
let hasDrawnNumbers = false;
let currentDrawNumbers = [];
let currentDrawNumberSet = new Set();
let lastCardCount = 1;
let visibleDrawRows = 0;
let revealedBallCount = 0;

function getSelectedCardCount() {
  return CARD_OPTIONS[Number(cardSlider.value)];
}

function updateSelectedCount() {
  selectedCount.textContent = getSelectedCardCount();
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

function createCard() {
  const card = document.createElement("article");
  card.className = "card generated-card";

  const numberList = document.createElement("div");
  numberList.className = "number-list";

  const numbers = pickUniqueNumbers(NUMBERS_PER_CARD, MIN_NUMBER, MAX_NUMBER);
  card.dataset.originalNumbers = numbers.join(",");

  renderCardNumbers(numberList, numbers);
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

function renderCardNumbers(numberList, numbers) {
  const fragment = document.createDocumentFragment();

  numberList.replaceChildren();

  numbers.forEach((number, numberIndex) => {
    const numberPill = createRaffleBall(number, numberIndex, "number-pill");
    numberPill.style.setProperty("--number-delay", `${numberIndex * 90}ms`);
    fragment.append(numberPill);
  });

  numberList.append(fragment);
}

function renderShowcaseBalls(numbers, revealedCount = 0) {
  const glass = homeShowcase.querySelector(".showcase-glass");
  const fragment = document.createDocumentFragment();

  glass.replaceChildren();

  numbers.forEach((number, numberIndex) => {
    const revealClass = numberIndex < revealedCount ? " is-revealed" : "";
    const showcaseBall = createRaffleBall(number, numberIndex, `showcase-ball${revealClass}`);
    showcaseBall.style.setProperty("--ball-delay", `${getKaroRevealOrder(numberIndex) * 34}ms`);
    showcaseBall.style.setProperty("--number-delay", `${numberIndex * 18}ms`);
    fragment.append(showcaseBall);
  });

  glass.append(fragment);
}

function renderHomeShowcase() {
  renderShowcaseBalls(pickUniqueNumbers(49, MIN_NUMBER, MAX_NUMBER), 0);
}

function getKaroRevealOrder(index) {
  const rowIndex = Math.floor(index / 7);
  const columnIndex = index % 7;
  const diagonalIndex = rowIndex + columnIndex;
  const diagonalStart = diagonalIndex <= 6
    ? (diagonalIndex * (diagonalIndex + 1)) / 2
    : 49 - ((13 - diagonalIndex) * (14 - diagonalIndex)) / 2;
  const diagonalPosition = diagonalIndex <= 6
    ? rowIndex
    : rowIndex - (diagonalIndex - 6);

  return diagonalStart + diagonalPosition;
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
          numberPill.style.setProperty("--win-delay", `${winMatchIndex * 55}ms`);
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

  for (let index = 0; index < cardCount; index += 1) {
    resultGrid.append(createCard());
  }

  sliderPanel.replaceChildren(resultGrid);
  sliderPanel.classList.remove("is-leaving");
  sliderPanel.classList.add("is-card-result");
  sliderPanel.dataset.cardCount = cardCount;
  topbar.classList.add("is-hidden");
  closePanel("how");
  closePanel("settings");
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
  homeShowcase.classList.remove("is-hidden");
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
  const panel = panelName === "how" ? howPanel : settingsPanel;
  const button = panelName === "how" ? openHowPanel : openSettingsPanel;

  panel.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");
  button.setAttribute("aria-expanded", "true");
}

function closePanel(panelName) {
  const panel = panelName === "how" ? howPanel : settingsPanel;
  const button = panelName === "how" ? openHowPanel : openSettingsPanel;

  panel.classList.remove("is-open");
  panel.setAttribute("aria-hidden", "true");
  button.setAttribute("aria-expanded", "false");
}

function getSortedCardNumbers(numbers) {
  if (cardSortSelect.value === "random") {
    return numbers;
  }

  if (cardSortSelect.value === "asc") {
    return [...numbers].sort((first, second) => first - second);
  }

  return [...numbers].sort((first, second) => second - first);
}

function sortCardNumbers() {
  const cards = sliderPanel.querySelectorAll(".card");

  cards.forEach((card) => {
    const originalNumbers = card.dataset.originalNumbers
      .split(",")
      .map((number) => Number(number));
    const numberList = card.querySelector(".number-list");

    renderCardNumbers(numberList, getSortedCardNumbers(originalNumbers));
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

  currentDrawNumbers = pickUniqueNumbers(49, MIN_NUMBER, MAX_NUMBER);
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
  visibleDrawRows = 7;
  revealedBallCount = 49;

  renderDrawShowcase(currentDrawNumbers, 49);
  completeDrawView();
}

function renderNextDrawRow() {
  prepareDrawNumbers();
  const stepAmount = KARO_REVEAL_STEPS[visibleDrawRows] ?? 0;
  visibleDrawRows = Math.min(visibleDrawRows + 1, KARO_REVEAL_STEPS.length);
  revealedBallCount = Math.min(revealedBallCount + stepAmount, 49);

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

openHowPanel.addEventListener("click", () => openPanel("how"));
openSettingsPanel.addEventListener("click", () => openPanel("settings"));

document.querySelectorAll("[data-close-panel]").forEach((button) => {
  button.addEventListener("click", () => closePanel(button.dataset.closePanel));
});

cardSortSelect.addEventListener("change", sortCardNumbers);

drawButton.addEventListener("click", () => {
  if (hasDrawnNumbers) {
    resetGame();
    return;
  }

  renderDrawNumbers();
});

rowDrawButton.addEventListener("click", renderNextDrawRow);

mainMenuButton.addEventListener("click", restoreCardSelection);
