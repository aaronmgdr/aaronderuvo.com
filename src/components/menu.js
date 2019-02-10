import React from "react"
import { css } from "@emotion/core"
import { Link } from "gatsby"

export default () => (
  <nav css={menuCSS}>
    <Link to="/">
      <span css={menuText}>home</span>{" "}
    </Link>
    <Link to="/meta">
      <span css={menuText}> meta </span>{" "}
    </Link>
  </nav>
)

const menuCSS = css({
  display: "flex",
  justifyContent: "space-between",
  backgroundColor: "rgba(0,0,0, 0.05)",
  width: "100vw"
})
const menuText = css({
  height: "1em",
  fontSize: "0.8em",
  padding: "0.2em 1em",
  "&:hover": {
    backgroundColor: "rgba(0,0,0, 0.025)",
    color: "white"
  }
})
