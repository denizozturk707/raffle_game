const CARD_OPTIONS = [1, 2, 4, 8, 16, 32, 64];
const NUMBERS_PER_CARD = 7;
const MIN_NUMBER = 10;
const MAX_NUMBER = 99;
const KARO_REVEAL_STEPS = [10, 9, 8, 7, 6, 5, 3, 1];
const SHOWCASE_ROW_COUNTS = KARO_REVEAL_STEPS;
const DRAW_BALL_COUNT = SHOWCASE_ROW_COUNTS.reduce((total, rowCount) => total + rowCount, 0);
const TOMBALA_NUMBER_CELLS = [5, 7, 9, 1, 3, 11, 13];
const TOMBALA_CARD_COUNTS = [1, 2, 4, 8, 16, 32, 64];
const TOMBALA_LAYOUTS = {
  default: { totalCells: 15, cellClass: "tombala-number-list-15", numberCells: TOMBALA_NUMBER_CELLS },
  compact: { totalCells: 12, cellClass: "tombala-number-list-12" },
  micro: { totalCells: 8, cellClass: "tombala-number-list-8" }
};
const REVEAL_STEP_MS = 34;
const MATCH_DELAY_BASE_MS = 1160;
const MATCH_ANIMATION_MS = 760;
const PRIZE_DELAY_BASE_MS = 520;
const PRIZE_ANIMATION_MS = 1300;
const FINAL_UNLOCK_BUFFER_MS = 0;
const FINAL_UNLOCK_EARLY_MS = 520;
const BUTTON_TEXT_FADE_MS = 260;
const SHOWCASE_TEXT_HIDE_MS = 520;

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
let isDrawComplete = false;
let isActionLocked = false;
let actionLockTimer;
let topbarModeTimer;
let languageButtonTimer;
let homeShowcaseNumbers = [];

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

  if (!isGameMode) {
    topbar.classList.remove("is-game-topbar");
    openHowPanel.innerHTML = `<span class="menu-button-label">${nextLabel}</span>`;
    openHowPanel.classList.remove("is-menu-switching-out");
    openHowPanel.classList.add("is-menu-switching-in");

    topbarModeTimer = window.setTimeout(() => {
      openHowPanel.classList.remove("is-menu-switching-in");
    }, 360);
    return;
  }

  openHowPanel.classList.add("is-menu-switching-out");

  topbarModeTimer = window.setTimeout(() => {
    topbar.classList.add("is-game-topbar");
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

function getButtonLabel(button) {
  let label = button.querySelector(".button-label");

  if (!label) {
    label = document.createElement("span");
    label.className = "button-label";
    label.textContent = button.textContent.trim();
    button.replaceChildren(label);
  }

  return label;
}

function setButtonText(button, text) {
  getButtonLabel(button).textContent = text;
}

function setButtonTextSmooth(button, text, delay = 0) {
  const label = getButtonLabel(button);

  window.setTimeout(() => {
    label.classList.add("is-fading-out");

    window.setTimeout(() => {
      label.textContent = text;
      label.classList.remove("is-fading-out");
      label.classList.add("is-fading-in");

      window.setTimeout(() => {
        label.classList.remove("is-fading-in");
      }, BUTTON_TEXT_FADE_MS);
    }, BUTTON_TEXT_FADE_MS);
  }, delay);
}

function getAnimationLockDuration(revealedCount) {
  const lastRevealOrder = Math.max(0, revealedCount - 1);
  const matchEndMs = lastRevealOrder * REVEAL_STEP_MS + MATCH_DELAY_BASE_MS + MATCH_ANIMATION_MS;
  const prizeEndMs = lastRevealOrder * REVEAL_STEP_MS + PRIZE_DELAY_BASE_MS + PRIZE_ANIMATION_MS;

  return Math.max(0, Math.max(matchEndMs, prizeEndMs) + FINAL_UNLOCK_BUFFER_MS - FINAL_UNLOCK_EARLY_MS);
}

function setRoundActionsLocked(isLocked) {
  isActionLocked = isLocked;
  rowDrawButton.classList.toggle("is-action-locked", isLocked);
  drawButton.classList.toggle("is-action-locked", isLocked);
}

function lockRoundActions(duration, onUnlock) {
  window.clearTimeout(actionLockTimer);
  setRoundActionsLocked(true);

  actionLockTimer = window.setTimeout(() => {
    setRoundActionsLocked(false);

    if (onUnlock) {
      onUnlock();
    }
  }, duration);
}

function showRoundActions() {
  roundActions.classList.remove("is-hidden", "is-leaving-down", "is-entering");
  void roundActions.offsetWidth;
  roundActions.classList.add("is-entering");

  window.setTimeout(() => {
    roundActions.classList.remove("is-entering");
  }, 440);
}

function hideRoundActionsWithExit(callback) {
  if (roundActions.classList.contains("is-hidden")) {
    callback?.();
    return;
  }

  roundActions.classList.remove("is-entering");
  roundActions.classList.add("is-leaving-down");

  window.setTimeout(() => {
    roundActions.classList.add("is-hidden");
    roundActions.classList.remove("is-leaving-down");
    callback?.();
  }, 330);
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

function getTombalaLayout(cardCount) {
  if (cardCount === 64) {
    return TOMBALA_LAYOUTS.micro;
  }

  if (cardCount === 16 || cardCount === 32) {
    return TOMBALA_LAYOUTS.compact;
  }

  return TOMBALA_LAYOUTS.default;
}

function hasThreeAdjacentCellsInLine(cells, columnCount, rowCount) {
  const cellSet = new Set(cells);

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const rowStart = rowIndex * columnCount;

    for (let columnIndex = 0; columnIndex <= columnCount - 3; columnIndex += 1) {
      if (
        cellSet.has(rowStart + columnIndex) &&
        cellSet.has(rowStart + columnIndex + 1) &&
        cellSet.has(rowStart + columnIndex + 2)
      ) {
        return true;
      }
    }
  }

  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    for (let rowIndex = 0; rowIndex <= rowCount - 3; rowIndex += 1) {
      if (
        cellSet.has(rowIndex * columnCount + columnIndex) &&
        cellSet.has((rowIndex + 1) * columnCount + columnIndex) &&
        cellSet.has((rowIndex + 2) * columnCount + columnIndex)
      ) {
        return true;
      }
    }
  }

  return false;
}

function getTombalaNumberCells(layout) {
  if (layout.numberCells) {
    return layout.numberCells;
  }

  let pickedCells = pickUniqueNumbers(NUMBERS_PER_CARD, 0, layout.totalCells - 1).sort((first, second) => first - second);

  while (layout.totalCells === 12 && hasThreeAdjacentCellsInLine(pickedCells, 4, 3)) {
    pickedCells = pickUniqueNumbers(NUMBERS_PER_CARD, 0, layout.totalCells - 1).sort((first, second) => first - second);
  }

  return pickedCells;
}

function createCard(cardCount = 1) {
  const useTombalaLayout = TOMBALA_CARD_COUNTS.includes(cardCount);
  const tombalaLayout = getTombalaLayout(cardCount);
  const tombalaNumberCells = getTombalaNumberCells(tombalaLayout);
  const card = document.createElement("article");
  card.className = useTombalaLayout ? `card generated-card tombala-card ${tombalaLayout.cellClass.replace("number-list", "card")}` : "card generated-card";

  const numberList = document.createElement("div");
  numberList.className = useTombalaLayout ? `number-list tombala-number-list ${tombalaLayout.cellClass}` : "number-list";

  const numbers = pickUniqueNumbers(NUMBERS_PER_CARD, MIN_NUMBER, MAX_NUMBER);
  card.dataset.originalNumbers = numbers.join(",");
  card.dataset.tombalaTotalCells = tombalaLayout.totalCells;
  card.dataset.tombalaNumberCells = tombalaNumberCells.join(",");
  card.dataset.tombalaListClass = tombalaLayout.cellClass;

  if (useTombalaLayout) {
    renderTombalaCardNumbers(numberList, numbers, tombalaLayout.totalCells, tombalaNumberCells);
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

function renderTombalaCardNumbers(numberList, numbers, totalCells = 15, numberCells = TOMBALA_NUMBER_CELLS) {
  const fragment = document.createDocumentFragment();
  let numberIndex = 0;

  numberList.replaceChildren();

  for (let cellIndex = 0; cellIndex < totalCells; cellIndex += 1) {
    const cell = document.createElement("span");
    cell.className = "tombala-cell";

    if (numberCells.includes(cellIndex)) {
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
  const hasShowcaseBalls = homeShowcase.querySelectorAll(".showcase-ball").length === DRAW_BALL_COUNT;

  if (homeShowcaseNumbers.length === 0) {
    homeShowcaseNumbers = pickUniqueNumbers(DRAW_BALL_COUNT, MIN_NUMBER, MAX_NUMBER);
  }

  if (hasShowcaseBalls) {
    return;
  }

  renderShowcaseBalls(homeShowcaseNumbers, 0);
}

function restoreHomeShowcase() {
  const hasShowcaseBalls = homeShowcase.querySelectorAll(".showcase-ball").length === DRAW_BALL_COUNT;

  if (!hasShowcaseBalls) {
    renderHomeShowcase();
    return;
  }

  hideShowcaseNumbers({
    smooth: true,
    onComplete: () => {
      updateShowcaseNumbers(homeShowcaseNumbers);
    }
  });
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

function hideShowcaseNumbers(options = {}) {
  const { smooth = false, onComplete } = options;
  const showcaseBalls = homeShowcase.querySelectorAll(".showcase-ball");
  const revealedBalls = [...showcaseBalls].filter((ball) => ball.classList.contains("is-revealed"));

  if (smooth && revealedBalls.length > 0) {
    revealedBalls.forEach((ball, index) => {
      ball.style.setProperty("--hide-delay", `${index * 6}ms`);
      ball.classList.add("is-hiding-number");
    });

    window.setTimeout(() => {
      revealedBalls.forEach((ball) => {
        ball.classList.remove("is-revealed", "is-hiding-number");
        ball.style.removeProperty("--hide-delay");
      });

      onComplete?.();
    }, SHOWCASE_TEXT_HIDE_MS + revealedBalls.length * 6);

    return;
  }

  showcaseBalls.forEach((ball) => {
    ball.classList.remove("is-revealed", "is-hiding-number");
    ball.style.removeProperty("--hide-delay");
  });

  onComplete?.();
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
        numberPill.style.setProperty("--match-delay", `${revealOrder * REVEAL_STEP_MS + MATCH_DELAY_BASE_MS}ms`);
        previewMatchOrders.push(revealOrder);
        previewMatchCount += 1;
      }
    });

    card.classList.remove("is-preview-five-match-card", "is-preview-six-match-card", "is-preview-jackpot-card");
    previewMatchOrders.sort((first, second) => first - second);

    if (previewMatchCount >= 5) {
      const prizeIndex = Math.min(previewMatchCount, 7) - 1;
      const prizeDelay = previewMatchOrders[prizeIndex] * REVEAL_STEP_MS + PRIZE_DELAY_BASE_MS;
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

function areAllCardsJackpotWithRevealedNumbers(numbers, revealedCount) {
  const revealedNumberSet = new Set(getRevealedDrawNumbers(numbers, revealedCount));
  const cards = sliderPanel.querySelectorAll(".card");

  if (cards.length === 0) {
    return false;
  }

  return [...cards].every((card) => {
    const cardNumbers = [...card.querySelectorAll(".number-pill")]
      .map((numberPill) => Number(numberPill.dataset.number));

    return cardNumbers.length === NUMBERS_PER_CARD && cardNumbers.every((number) => revealedNumberSet.has(number));
  });
}

function renderSingleCardInSliderPlace() {
  renderCardsInSliderPlace(getSelectedCardCount());
}

function createCardResultGrid(cardCount, extraClass = "") {
  const resultGrid = document.createElement("div");
  resultGrid.className = `card-result-grid card-result-grid-${cardCount} ${extraClass}`.trim();

  return resultGrid;
}

function createSixtyFourCardLayout() {
  const layout = document.createElement("div");
  const occupiedSlots = [];

  layout.className = "card-result-grid card-result-grid-64 card-result-layout-64";

  for (let rowIndex = 0; rowIndex < 7; rowIndex += 1) {
    occupiedSlots.push(rowIndex * 13, rowIndex * 13 + 1, rowIndex * 13 + 11, rowIndex * 13 + 12);
  }

  for (let rowIndex = 3; rowIndex < 7; rowIndex += 1) {
    for (let columnIndex = 2; columnIndex < 11; columnIndex += 1) {
      occupiedSlots.push(rowIndex * 13 + columnIndex);
    }
  }

  occupiedSlots.forEach((slotIndex) => {
    const card = createCard(64);
    card.style.gridColumn = `${(slotIndex % 13) + 1}`;
    card.style.gridRow = `${Math.floor(slotIndex / 13) + 1}`;

    layout.append(card);
  });

  return layout;
}

function renderCardsInSliderPlace(cardCount) {
  lastCardCount = cardCount;

  const resultGrid = cardCount === 64 ? createSixtyFourCardLayout() : createCardResultGrid(cardCount);

  if (cardCount !== 64) {
    for (let index = 0; index < cardCount; index += 1) {
      resultGrid.append(createCard(cardCount));
    }
  }

  sliderPanel.replaceChildren(resultGrid);
  sliderPanel.classList.remove("is-leaving");
  sliderPanel.classList.add("is-card-result");
  sliderPanel.dataset.cardCount = cardCount;
  homeShowcase.dataset.cardCount = cardCount;
  homeShowcase.classList.add("is-game-showcase");
  topbar.classList.remove("is-hidden");
  setTopbarGameMode(true);
  closePanel("how");
  cardsGrid.className = "cards-grid";
  cardsGrid.replaceChildren();
  revealedBallCount = 0;
  isDrawComplete = false;
  roundActions.className = `round-actions round-actions-${cardCount}`;
  showRoundActions();
  window.clearTimeout(actionLockTimer);
  isActionLocked = false;
  drawButton.disabled = false;
  rowDrawButton.disabled = false;
  rowDrawButton.classList.remove("is-hidden");
  rowDrawButton.classList.remove("is-action-locked");
  drawButton.classList.remove("is-action-locked");
  setButtonText(rowDrawButton, "Bir Satır Görüntüle");
  setButtonText(drawButton, "Tüm Topları Görüntüle");
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

function bindCardSelectionControls(cardCountToRestore) {
  cardSlider = document.querySelector("#cardSlider");
  selectedCount = document.querySelector("#selectedCount");
  createCardsButton = document.querySelector("#createCardsButton");

  if (cardCountToRestore) {
    const optionIndex = CARD_OPTIONS.indexOf(cardCountToRestore);

    if (optionIndex !== -1) {
      cardSlider.value = optionIndex;
    }
  }

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
  homeShowcase.removeAttribute("data-card-count");
  roundActions.className = "round-actions is-hidden";
  window.clearTimeout(actionLockTimer);
  isActionLocked = false;
  drawButton.disabled = true;
  rowDrawButton.disabled = true;
  rowDrawButton.classList.remove("is-hidden");
  rowDrawButton.classList.remove("is-action-locked");
  drawButton.classList.remove("is-action-locked");
  setButtonText(drawButton, "Tüm Topları Görüntüle");
  hasDrawnNumbers = false;
  currentDrawNumbers = [];
  currentDrawNumberSet = new Set();
  visibleDrawRows = 0;
  revealedBallCount = 0;
  isDrawComplete = false;
  cardsGrid.replaceChildren();
  cardsGrid.className = "cards-grid";
  restoreHomeShowcase();
  bindCardSelectionControls(lastCardCount);
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
      const totalCells = Number(card.dataset.tombalaTotalCells || 15);
      const numberCells = (card.dataset.tombalaNumberCells || TOMBALA_NUMBER_CELLS.join(","))
        .split(",")
        .map((cellIndex) => Number(cellIndex));

      renderTombalaCardNumbers(numberList, getSortedCardNumbers(originalNumbers), totalCells, numberCells);
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

function completeDrawView(lockDuration = getAnimationLockDuration(DRAW_BALL_COUNT)) {
  markFullyMatchedCards(currentDrawNumbers);
  hasDrawnNumbers = true;
  isDrawComplete = true;
  rowDrawButton.classList.remove("is-hidden");
  setButtonTextSmooth(rowDrawButton, "Kart Adedi Seç");
  setButtonTextSmooth(drawButton, "Tekrar Oyna");
  lockRoundActions(lockDuration);
}

function completeDrawEarly() {
  const revealedDrawNumbers = getRevealedDrawNumbers(currentDrawNumbers, revealedBallCount);
  const lockDuration = getAnimationLockDuration(revealedBallCount);

  markFullyMatchedCards(revealedDrawNumbers);
  hasDrawnNumbers = true;
  isDrawComplete = true;
  rowDrawButton.classList.remove("is-hidden");
  setButtonTextSmooth(rowDrawButton, "Kart Adedi Seç");
  setButtonTextSmooth(drawButton, "Tekrar Oyna");
  lockRoundActions(lockDuration);
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

  if (areAllCardsJackpotWithRevealedNumbers(currentDrawNumbers, revealedBallCount)) {
    completeDrawEarly();
    return;
  }

  if (visibleDrawRows === KARO_REVEAL_STEPS.length) {
    completeDrawView();
    return;
  }
}

function resetGame() {
  hasDrawnNumbers = false;
  currentDrawNumbers = [];
  currentDrawNumberSet = new Set();
  visibleDrawRows = 0;
  revealedBallCount = 0;
  isDrawComplete = false;
  hideShowcaseNumbers();
  cardsGrid.replaceChildren();
  cardsGrid.className = "cards-grid";
  renderCardsInSliderPlace(lastCardCount);
}

bindCardSelectionControls();
renderHomeShowcase();

openHowPanel.addEventListener("click", () => {
  if (topbar.classList.contains("is-game-topbar")) {
    if (isActionLocked) {
      return;
    }

    hideRoundActionsWithExit(restoreCardSelection);
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
  if (isActionLocked) {
    return;
  }

  if (hasDrawnNumbers) {
    hideRoundActionsWithExit(resetGame);
    return;
  }

  renderDrawNumbers();
});

rowDrawButton.addEventListener("click", () => {
  if (isActionLocked) {
    return;
  }

  if (isDrawComplete) {
    hideRoundActionsWithExit(restoreCardSelection);
    return;
  }

  renderNextDrawRow();
});
