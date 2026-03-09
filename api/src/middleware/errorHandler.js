function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${err.message}`, err.stack);

  // Blockchain errors
  if (err.message?.includes("revert")) {
    return res.status(400).json({
      error: "Smart contract error",
      detail: err.message,
    });
  }

  // Validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({ error: err.message });
  }

  // Default
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
}

module.exports = { errorHandler };
