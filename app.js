
      const table = document.getElementById("studyTable");
      const toggleBtn = document.getElementById("toggleBtn");
      const newQuizBtn = document.getElementById("newQuizBtn");

      let solutionsShown = false;
      const rowState = new Map();

      let quizRows = [];
      let currentRowIndex = 0;

      function getHeaderLabels() {
        return [...table.tHead.rows[0].cells].map((th) =>
          th.textContent.trim()
        );
      }

      function countItems(text) {
        const t = (text ?? "").toString().trim();
        if (t === "") return 0;
        return t
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean).length;
      }

      function ensureActionButtons() {
        [...table.tBodies[0].rows].forEach((row) => {
          const actionCell = row.cells[row.cells.length - 7];
          actionCell.dataset.actionCell = "true";
          if (!actionCell.querySelector("button")) {
            const btn = document.createElement("button");
            btn.className = "row-btn";
            btn.textContent = "Nicht eindeutig? Weiteren Eintrag anzeigen.";
            btn.addEventListener("click", () => revealNextInRow(row));
            actionCell.appendChild(btn);
          }
        });
      }

      function setMobileLabels() {
        const labels = getHeaderLabels();
        [...table.tBodies[0].rows].forEach((row) => {
          [...row.cells].forEach((td, i) =>
            td.setAttribute("data-label", labels[i] || "")
          );
        });
      }

      function wrapStudyCellsWithInputs() {
        const headersLower = getHeaderLabels().map((h) => h.toLowerCase());
        const actionIndex = headersLower.indexOf("aktion");

        [...table.tBodies[0].rows].forEach((row) => {
          [...row.cells].forEach((td, colIndex) => {
            if (colIndex === actionIndex) return;
            if (td.dataset.wrapped === "true") return;

            const original = td.textContent.trim();
            const expected = countItems(original);
            td.dataset.expectedCount = expected;

            td.textContent = "";
            const wrap = document.createElement("div");
            wrap.className = "cell-wrap";

            const sol = document.createElement("div");
            sol.className = "solution";
            sol.textContent = original;
            wrap.appendChild(sol);

            const input = document.createElement("textarea");
            input.className = "user-input";
            input.placeholder = `(${expected} Antworten)`;
            input.dataset.userControl = "true";

            if (expected === 0) input.disabled = true;

            wrap.appendChild(input);
            td.appendChild(wrap);
            td.dataset.wrapped = "true";
          });
        });
      }

      function shuffleRows() {
        const tbody = table.tBodies[0];
        const rows = [...tbody.rows];
        for (let i = rows.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [rows[i], rows[j]] = [rows[j], rows[i]];
        }
        rows.forEach((r) => tbody.appendChild(r));
      }

      function buildRandomOrderForRow(row) {
        const cells = [...row.cells];
        const actionIndex = cells.findIndex(
          (c) => c.dataset.actionCell === "true"
        );

        const usable = cells
          .map((c, i) => ({
            i,
            t: c.querySelector(".solution")?.textContent.trim() ?? "",
          }))
          .filter((x) => x.i !== actionIndex && x.t.length > 0)
          .map((x) => x.i);

        const order = usable.slice();
        for (let i = order.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [order[i], order[j]] = [order[j], order[i]];
        }

        rowState.set(row, { order, revealedCount: 1, actionIndex });
      }

      function randomizeAllRows() {
        [...table.tBodies[0].rows].forEach(buildRandomOrderForRow);
      }

      function revealNextInRow(row) {
        const state = rowState.get(row);
        if (!state) return;
        if (state.revealedCount < state.order.length) {
          state.revealedCount++;
          applyMaskingToRow(row);
        }
      }

      function markEmptyInputsInRow(row) {
        row.querySelectorAll(".user-input").forEach((inp) => {
          if (inp.disabled) return;
          inp.classList.toggle("empty-input", !inp.value.trim());
        });
      }
      function clearEmptyMarks(row) {
        row.querySelectorAll(".user-input").forEach((inp) => {
          inp.classList.remove("empty-input");
        });
      }

      function applyMaskingToRow(row) {
        const state = rowState.get(row);
        const cells = [...row.cells];
        const { order, revealedCount, actionIndex } = state;

        const revealedSet = new Set(order.slice(0, revealedCount));

        if (!solutionsShown) {
          const visible = revealedSet;
          cells.forEach((cell, i) => {
            if (i === actionIndex) return;

            const sol = cell.querySelector(".solution");
            const input = cell.querySelector(".user-input");
            if (!sol || !input) return;

            if (visible.has(i)) {
              sol.classList.remove("hidden-solution");
              input.style.display = "none";
            } else {
              sol.classList.add("hidden-solution");
              input.style.display = "";
            }
          });

          clearEmptyMarks(row);
          return;
        }

        cells.forEach((cell, i) => {
          if (i === actionIndex) return;

          const sol = cell.querySelector(".solution");
          const input = cell.querySelector(".user-input");
          if (!sol || !input) return;

          sol.classList.remove("hidden-solution");
          input.style.display = revealedSet.has(i) ? "none" : "";
        });

        markEmptyInputsInRow(row);
      }

      function showOnlyCurrentRow() {
        const tbodyRows = [...table.tBodies[0].rows];
        tbodyRows.forEach((r, idx) => {
          r.style.display = idx === currentRowIndex ? "" : "none";
        });
      }

      function applyMasking() {
        showOnlyCurrentRow();

        const currentRow = quizRows[currentRowIndex];
        if (currentRow) applyMaskingToRow(currentRow);

        toggleBtn.textContent = solutionsShown
          ? "Lösungen verbergen"
          : "Lösungen zeigen";
        toggleBtn.dataset.state = solutionsShown ? "shown" : "hidden";
        document.body.classList.toggle("solutions-shown", solutionsShown);
      }

      function clearInputsInRow(row) {
        row.querySelectorAll(".user-input").forEach((i) => {
          i.value = "";
        });
      }

      function ensureNextButton() {
        if (document.getElementById("nextRowBtn")) return;

        const nextBtn = document.createElement("button");
        nextBtn.id = "nextRowBtn";
        nextBtn.textContent = "Nächster Muskel";
        nextBtn.addEventListener("click", () => {
          const oldRow = quizRows[currentRowIndex];

          currentRowIndex++;
          if (currentRowIndex >= quizRows.length) {
            currentRowIndex = quizRows.length - 1;
            alert("Juhu, geschafft! Bereit für die Klausur oder von vorne?");
            return;
          }

          solutionsShown = false;
          const newRow = quizRows[currentRowIndex];
          clearInputsInRow(newRow);
          buildRandomOrderForRow(newRow);

          applyMasking();
        });

        document.querySelector(".controls").appendChild(nextBtn);
      }

      function startNewQuiz() {
        solutionsShown = false;
        shuffleRows();
        setMobileLabels();
        randomizeAllRows();

        quizRows = [...table.tBodies[0].rows];
        currentRowIndex = 0;

        // aktuelle Zeile leeren + random order neu
        const firstRow = quizRows[0];
        if (firstRow) {
          clearInputsInRow(firstRow);
          buildRandomOrderForRow(firstRow);
        }

        applyMasking();
      }

      newQuizBtn.addEventListener("click", startNewQuiz);

      toggleBtn.addEventListener("click", () => {
        solutionsShown = !solutionsShown;
        applyMasking();
      });

      // INIT
      ensureActionButtons();
      wrapStudyCellsWithInputs();
      ensureNextButton();
      startNewQuiz();