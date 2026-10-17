const STORAGE_KEY = "little-ledger-gradebook-v1";
const BACKUP_VERSION = 1;

const gradeForm = document.querySelector("#grade-form");
const gradeStudent = document.querySelector("#grade-student");
const assignmentInput = document.querySelector("#assignment");
const subjectInput = document.querySelector("#grade-subject");
const subjectOptions = document.querySelector("#subject-options");
const dateInput = document.querySelector("#grade-date");
const gradeType = document.querySelector("#grade-type");
const scoreFields = document.querySelector("#score-fields");
const formError = document.querySelector("#form-error");
const saveGradeButton = document.querySelector("#save-grade-button");
const cancelEditButton = document.querySelector("#cancel-edit");
const firstStudent = document.querySelector("#first-student");
const studentDialog = document.querySelector("#student-dialog");
const studentForm = document.querySelector("#student-form");
const studentNameInput = document.querySelector("#student-name");
const studentGradeLevel = document.querySelector("#student-grade-level");
const statusMessage = document.querySelector("#status-message");
const gradeList = document.querySelector("#grade-list");
const emptyState = document.querySelector("#empty-state");
const emptyTitle = document.querySelector("#empty-title");
const emptyCopy = document.querySelector("#empty-copy");
const recordCount = document.querySelector("#record-count");
const filterSummary = document.querySelector("#filter-summary");
const filterStudent = document.querySelector("#filter-student");
const filterSubject = document.querySelector("#filter-subject");
const filterFrom = document.querySelector("#filter-from");
const filterTo = document.querySelector("#filter-to");
const searchInput = document.querySelector("#search-assignment");
const restoreFile = document.querySelector("#restore-file");

let data = { version: BACKUP_VERSION, students: [], grades: [] };
let selectedStudentId = "";
let editingGradeId = "";
let storageAvailable = true;

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" })
    .format(new Date(year, month - 1, day));
}

function isDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function isValidGrade(grade, studentIds) {
  if (!grade || typeof grade !== "object") return false;
  if (typeof grade.id !== "string" || !studentIds.has(grade.studentId)) return false;
  if (typeof grade.assignment !== "string" || !grade.assignment.trim()) return false;
  if (typeof grade.subject !== "string" || !grade.subject.trim() || !isDate(grade.date)) return false;
  if (grade.gradeType === "points") {
    return Number.isFinite(grade.earned) && grade.earned >= 0 &&
      Number.isFinite(grade.possible) && grade.possible > 0;
  }
  if (grade.gradeType === "percent") {
    return Number.isFinite(grade.percentage) && grade.percentage >= 0 && grade.percentage <= 100;
  }
  return grade.gradeType === "letter" && typeof grade.letter === "string" &&
    grade.letter.trim().length > 0 && grade.letter.length <= 30;
}

function isValidData(value) {
  if (!value || value.version !== BACKUP_VERSION ||
      !Array.isArray(value.students) || !Array.isArray(value.grades)) return false;
  const studentIds = new Set();
  for (const student of value.students) {
    if (!student || typeof student.id !== "string" || studentIds.has(student.id) ||
        typeof student.name !== "string" || !student.name.trim() ||
        typeof student.gradeLevel !== "string" || !Array.isArray(student.subjects) ||
        student.subjects.some((subject) => typeof subject !== "string")) return false;
    studentIds.add(student.id);
  }
  const gradeIds = new Set();
  for (const grade of value.grades) {
    if (!isValidGrade(grade, studentIds) || gradeIds.has(grade.id)) return false;
    gradeIds.add(grade.id);
  }
  return true;
}

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return;
    const parsed = JSON.parse(saved);
    if (!isValidData(parsed)) throw new Error("The saved gradebook has an unexpected format.");
    data = parsed;
    selectedStudentId = data.students[0]?.id ?? "";
  } catch (error) {
    storageAvailable = false;
    setStatus(`Saved grades could not be loaded: ${error.message} New changes will only last until you close this page.`, true);
  }
}

function saveData() {
  if (!storageAvailable) return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    storageAvailable = false;
    setStatus("This browser couldn't save your gradebook. Your current changes will only last until you close this page.", true);
    return false;
  }
}

function fillStudentSelect(select, includeAll = false, selectedValue = "") {
  const options = [];
  if (includeAll) options.push(new Option("All students", ""));
  for (const student of data.students) {
    const option = new Option(`${student.name} · ${student.gradeLevel}`, student.id);
    options.push(option);
  }
  select.replaceChildren(...options);
  if (selectedValue && data.students.some((student) => student.id === selectedValue)) {
    select.value = selectedValue;
  } else if (!includeAll && data.students.length) {
    select.value = data.students[0].id;
  } else if (includeAll) {
    select.value = selectedValue;
  }
}

function updateSubjectOptions() {
  const student = data.students.find((item) => item.id === gradeStudent.value);
  const subjects = student?.subjects ?? [];
  subjectOptions.replaceChildren(...subjects.map((subject) => new Option(subject, subject)));
  const chosenStudent = filterStudent.value;
  const allSubjects = chosenStudent
    ? (data.students.find((item) => item.id === chosenStudent)?.subjects ?? [])
    : [...new Set(data.students.flatMap((item) => item.subjects))].sort((a, b) => a.localeCompare(b));
  const currentFilter = filterSubject.value;
  filterSubject.replaceChildren(new Option("All subjects", ""));
  for (const subject of allSubjects) filterSubject.add(new Option(subject, subject));
  if (allSubjects.includes(currentFilter)) filterSubject.value = currentFilter;
}

function renderStudentControls() {
  const entryStudent = gradeStudent.value || selectedStudentId;
  fillStudentSelect(gradeStudent, false, entryStudent);
  fillStudentSelect(filterStudent, true, filterStudent.value);
  updateSubjectOptions();
  firstStudent.hidden = data.students.length > 0;
  gradeForm.hidden = data.students.length === 0;
  document.querySelector("#add-student-button").disabled = false;
  document.querySelector("#backup-button").disabled = data.students.length === 0;
}

function addFieldLabel(id, text) {
  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = text;
  return label;
}

function createNumberField(id, name, labelText, value, min, step) {
  const wrapper = document.createElement("div");
  wrapper.className = "field";
  const input = document.createElement("input");
  input.id = id;
  input.name = name;
  input.type = "number";
  input.min = String(min);
  input.step = step;
  input.required = true;
  input.value = value ?? "";
  wrapper.append(addFieldLabel(id, labelText), input);
  return wrapper;
}

function renderScoreFields(value = {}) {
  scoreFields.replaceChildren();
  if (gradeType.value === "points") {
    const row = document.createElement("div");
    row.className = "score-input-row";
    row.append(
      createNumberField("points-earned", "earned", "Points earned", value.earned, 0, "any"),
      Object.assign(document.createElement("span"), { className: "score-divider", textContent: "out of" }),
      createNumberField("points-possible", "possible", "Points possible", value.possible, 0.01, "any"),
    );
    scoreFields.append(row);
  } else if (gradeType.value === "percent") {
    const field = createNumberField("percentage-score", "percentage", "Percentage", value.percentage, 0, "any");
    const input = field.querySelector("input");
    input.max = "100";
    input.placeholder = "e.g. 90";
    scoreFields.append(field);
  } else {
    const field = document.createElement("div");
    field.className = "field";
    const input = document.createElement("input");
    input.id = "letter-score";
    input.name = "letter";
    input.type = "text";
    input.maxLength = 30;
    input.placeholder = "e.g. A-, Pass, or Meets expectations";
    input.required = true;
    input.value = value.letter ?? "";
    field.append(addFieldLabel("letter-score", "Grade or label"), input);
    scoreFields.append(field);
  }
}

function gradeDisplay(grade) {
  if (grade.gradeType === "points") {
    return { main: `${grade.earned} / ${grade.possible}`, detail: "points" };
  }
  if (grade.gradeType === "percent") {
    return { main: `${grade.percentage}%`, detail: "percent" };
  }
  return { main: grade.letter, detail: "letter grade" };
}

function makeGradeCard(grade) {
  const student = data.students.find((item) => item.id === grade.studentId);
  const item = document.createElement("li");
  item.className = "grade-card";

  const mark = document.createElement("span");
  mark.className = "grade-mark";
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = grade.gradeType === "points" ? "#" : grade.gradeType === "percent" ? "%" : "A";

  const info = document.createElement("div");
  info.className = "grade-info";
  const title = document.createElement("p");
  title.className = "grade-title";
  title.textContent = grade.assignment;
  const meta = document.createElement("div");
  meta.className = "grade-meta";
  const studentName = document.createElement("span");
  studentName.textContent = student ? `${student.name} · ${student.gradeLevel}` : "Student";
  const subject = document.createElement("span");
  subject.className = "grade-subject";
  subject.textContent = grade.subject;
  const date = document.createElement("span");
  date.textContent = formatDate(grade.date);
  meta.append(studentName, subject, date);
  info.append(title, meta);

  const score = document.createElement("span");
  score.className = "grade-score";
  const display = gradeDisplay(grade);
  score.append(document.createTextNode(display.main));
  const detail = document.createElement("small");
  detail.textContent = display.detail;
  score.append(detail);

  const actions = document.createElement("div");
  actions.className = "grade-actions";
  const edit = document.createElement("button");
  edit.className = "grade-action";
  edit.type = "button";
  edit.dataset.action = "edit";
  edit.dataset.id = grade.id;
  edit.setAttribute("aria-label", `Edit ${grade.assignment}`);
  edit.textContent = "Edit";
  const remove = document.createElement("button");
  remove.className = "grade-action delete";
  remove.type = "button";
  remove.dataset.action = "delete";
  remove.dataset.id = grade.id;
  remove.setAttribute("aria-label", `Delete ${grade.assignment}`);
  remove.textContent = "×";
  actions.append(edit, remove);

  item.append(mark, info, score, actions);
  return item;
}

function renderGrades() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const from = filterFrom.value;
  const to = filterTo.value;
  const invalidRange = from && to && from > to;
  filterFrom.setAttribute("aria-invalid", String(Boolean(invalidRange)));
  filterTo.setAttribute("aria-invalid", String(Boolean(invalidRange)));

  const filtered = data.grades.filter((grade) => {
    if (filterStudent.value && grade.studentId !== filterStudent.value) return false;
    if (filterSubject.value && grade.subject !== filterSubject.value) return false;
    if (from && grade.date < from) return false;
    if (to && grade.date > to) return false;
    if (query && !grade.assignment.toLocaleLowerCase().includes(query)) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));

  gradeList.replaceChildren(...filtered.map(makeGradeCard));
  recordCount.textContent = String(data.grades.length);
  filterSummary.textContent = invalidRange
    ? "Choose a start date that is on or before the end date."
    : `Showing ${filtered.length} of ${data.grades.length} ${data.grades.length === 1 ? "grade" : "grades"}.`;
  emptyState.hidden = filtered.length > 0;

  if (data.grades.length === 0) {
    emptyTitle.textContent = "Your grade records start here.";
    emptyCopy.textContent = "Save a grade and you’ll be able to find it here whenever you need it.";
  } else if (invalidRange) {
    emptyTitle.textContent = "Check your date range.";
    emptyCopy.textContent = "The start date needs to be on or before the end date.";
  } else {
    emptyTitle.textContent = "No grades match those filters.";
    emptyCopy.textContent = "Try a different student, subject, date range, or assignment name.";
  }
}

function render() {
  renderStudentControls();
  renderGrades();
}

function resetGradeForm() {
  editingGradeId = "";
  gradeForm.reset();
  gradeType.value = "points";
  gradeStudent.value = selectedStudentId || data.students[0]?.id || "";
  dateInput.value = localDateValue();
  formError.textContent = "";
  document.querySelector("#entry-title").textContent = "Save a grade";
  document.querySelector("#entry-subtitle").textContent = "Add a schoolwork grade to your records.";
  saveGradeButton.textContent = "Save grade";
  cancelEditButton.hidden = true;
  updateSubjectOptions();
  renderScoreFields();
}

function startEdit(grade) {
  editingGradeId = grade.id;
  selectedStudentId = grade.studentId;
  renderStudentControls();
  gradeStudent.value = grade.studentId;
  assignmentInput.value = grade.assignment;
  subjectInput.value = grade.subject;
  dateInput.value = grade.date;
  gradeType.value = grade.gradeType;
  renderScoreFields(grade);
  document.querySelector("#entry-title").textContent = "Edit grade";
  document.querySelector("#entry-subtitle").textContent = "Update this saved schoolwork grade.";
  saveGradeButton.textContent = "Save changes";
  cancelEditButton.hidden = false;
  document.querySelector("#entry-title").scrollIntoView({ behavior: "smooth", block: "center" });
  assignmentInput.focus({ preventScroll: true });
}

function readGradeFromForm() {
  const grade = {
    id: editingGradeId || makeId(),
    studentId: gradeStudent.value,
    assignment: assignmentInput.value.trim(),
    subject: subjectInput.value.trim(),
    date: dateInput.value,
    gradeType: gradeType.value,
  };
  if (grade.gradeType === "points") {
    grade.earned = Number(gradeForm.elements.earned.value);
    grade.possible = Number(gradeForm.elements.possible.value);
  } else if (grade.gradeType === "percent") {
    grade.percentage = Number(gradeForm.elements.percentage.value);
  } else {
    grade.letter = gradeForm.elements.letter.value.trim();
  }
  return grade;
}

function addSubject(studentId, subject) {
  const student = data.students.find((item) => item.id === studentId);
  if (!student || student.subjects.some((name) => name.toLocaleLowerCase() === subject.toLocaleLowerCase())) return;
  student.subjects.push(subject);
  student.subjects.sort((a, b) => a.localeCompare(b));
}

function submitGrade(event) {
  event.preventDefault();
  formError.textContent = "";
  if (!gradeForm.reportValidity()) return;
  const grade = readGradeFromForm();
  if (!grade.assignment || !grade.subject || !isDate(grade.date)) {
    formError.textContent = "Enter an assignment, subject, and valid date.";
    return;
  }
  if (!isValidGrade(grade, new Set(data.students.map((student) => student.id)))) {
    formError.textContent = "Check the grade value and try again.";
    return;
  }

  const isEditing = Boolean(editingGradeId);
  if (isEditing) {
    const index = data.grades.findIndex((item) => item.id === editingGradeId);
    if (index === -1) {
      formError.textContent = "This grade could not be found. Refresh the page and try again.";
      return;
    }
    data.grades[index] = grade;
  } else {
    data.grades.push(grade);
  }
  addSubject(grade.studentId, grade.subject);
  selectedStudentId = grade.studentId;
  saveData();
  resetGradeForm();
  render();
  if (storageAvailable) setStatus(isEditing ? "Grade updated." : "Grade saved.");
}

function addStudent(event) {
  event.preventDefault();
  if (!studentForm.reportValidity()) return;
  const name = studentNameInput.value.trim();
  const gradeLevel = studentGradeLevel.value;
  if (!name || !gradeLevel) return;

  const student = { id: makeId(), name, gradeLevel, subjects: [] };
  data.students.push(student);
  selectedStudentId = student.id;
  saveData();
  studentForm.reset();
  studentDialog.close();
  resetGradeForm();
  render();
  if (storageAvailable) setStatus(`${student.name} added. Add a grade whenever you’re ready.`);
}

function handleGradeAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const grade = data.grades.find((item) => item.id === button.dataset.id);
  if (!grade) return;
  if (button.dataset.action === "edit") {
    startEdit(grade);
    return;
  }
  if (button.dataset.action === "delete") {
    if (!window.confirm(`Delete the grade for “${grade.assignment}”? This cannot be undone.`)) return;
    data.grades = data.grades.filter((item) => item.id !== grade.id);
    if (editingGradeId === grade.id) resetGradeForm();
    saveData();
    render();
    if (storageAvailable) setStatus("Grade deleted.");
  }
}

function downloadBackup() {
  const backup = { ...data, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `little-ledger-backup-${localDateValue()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus("Backup downloaded. Keep it somewhere safe.");
}

async function restoreBackup(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    setStatus("That backup is larger than 5 MB and can’t be restored.", true);
    return;
  }
  try {
    const parsed = JSON.parse(await file.text());
    if (!isValidData(parsed)) throw new Error("The file isn’t a Little Ledger backup or its contents are invalid.");
    const accepted = window.confirm("Restore this backup? It will replace all students and grades currently saved in this browser.");
    if (!accepted) return;
    data = { version: BACKUP_VERSION, students: parsed.students, grades: parsed.grades };
    selectedStudentId = data.students[0]?.id ?? "";
    filterStudent.value = "";
    filterSubject.value = "";
    filterFrom.value = "";
    filterTo.value = "";
    searchInput.value = "";
    resetGradeForm();
    saveData();
    render();
    if (storageAvailable) setStatus("Backup restored.");
  } catch (error) {
    setStatus(`Backup could not be restored: ${error.message}`, true);
  } finally {
    restoreFile.value = "";
  }
}

document.querySelector("#add-student-button").addEventListener("click", () => studentDialog.showModal());
document.querySelector("#first-student-button").addEventListener("click", () => studentDialog.showModal());
studentForm.addEventListener("submit", addStudent);
gradeForm.addEventListener("submit", submitGrade);
gradeType.addEventListener("change", () => renderScoreFields());
gradeStudent.addEventListener("change", () => {
  selectedStudentId = gradeStudent.value;
  updateSubjectOptions();
});
filterStudent.addEventListener("change", () => {
  updateSubjectOptions();
  renderGrades();
});
filterSubject.addEventListener("change", renderGrades);
filterFrom.addEventListener("change", renderGrades);
filterTo.addEventListener("change", renderGrades);
searchInput.addEventListener("input", renderGrades);
gradeList.addEventListener("click", handleGradeAction);
cancelEditButton.addEventListener("click", resetGradeForm);
document.querySelector("#backup-button").addEventListener("click", downloadBackup);
document.querySelector("#restore-button").addEventListener("click", () => restoreFile.click());
restoreFile.addEventListener("change", () => restoreBackup(restoreFile.files[0]));
document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => document.getElementById(button.dataset.close).close());
});
studentDialog.addEventListener("close", () => {
  if (data.students.length) assignmentInput.focus();
  else document.querySelector("#add-student-button").focus();
});

dateInput.value = localDateValue();
renderScoreFields();
loadData();
render();
