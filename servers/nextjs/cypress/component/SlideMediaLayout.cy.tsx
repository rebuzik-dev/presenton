import React from "react";

import SlideMediaLayout from "../../app/(presentation-generator)/components/SlideMediaLayout";

describe("SlideMediaLayout", () => {
  it("normalizes schema images without changing decorative images", () => {
    const slideData = {
      images: [
        {
          __image_url__: "/app_data/images/first-image.jpg",
          __image_prompt__: "First frame",
        },
        {
          __image_url__: "/app_data/images/second-image.jpg",
          __image_prompt__: "Second frame",
        },
      ],
    };

    cy.mount(
      <div style={{ width: 1280, height: 720 }}>
        <SlideMediaLayout
          slideData={slideData}
          slideIndex={0}
          properties={{
            0: {
              initialObjectFit: "contain",
              initialFocusPoint: { x: 25, y: 75 },
            },
          }}
        >
          <div style={{ display: "grid", height: 492 }}>
            <div data-testid="first-slot" style={{ overflow: "hidden" }}>
              <img
                data-testid="first-image"
                src="/app_data/images/first-image.jpg"
                alt="First"
              />
            </div>
            <div data-testid="second-slot" style={{ overflow: "hidden" }}>
              <img
                data-testid="second-image"
                src="/app_data/images/second-image.jpg"
                alt="Second"
              />
            </div>
          </div>
          <img data-testid="decorative-logo" src="/logo.svg" alt="Logo" />
        </SlideMediaLayout>
      </div>,
    );

    cy.get('[data-slide-render-state="ready"]')
      .should("have.attr", "data-normalized-image-count", "2");
    cy.get('[data-testid="first-slot"]')
      .should("have.css", "position", "relative")
      .and("have.css", "min-height", "0px");
    cy.get('[data-testid="first-image"]')
      .should("have.css", "position", "absolute")
      .and("have.css", "inset", "0px")
      .and("have.css", "object-fit", "contain")
      .and("have.css", "object-position", "25% 75%")
      .and("have.attr", "data-slide-media-path", "images[0]");
    cy.get('[data-testid="second-image"]')
      .should("have.css", "position", "absolute")
      .and("have.attr", "data-slide-media-path", "images[1]");
    cy.get('[data-testid="decorative-logo"]')
      .should("not.have.attr", "data-slide-media-normalized")
      .and("have.css", "position", "static");
  });
});
