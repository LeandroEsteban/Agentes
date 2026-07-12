"""Stable, stdlib-only data models for normalized specifications."""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class Provenance:
    document: str
    line_start: int
    line_end: int
    section: str


@dataclass(frozen=True)
class CatalogItem:
    code: str
    name: str
    module: str | None
    attributes: dict[str, Any]
    provenance: Provenance


# Typed names make the normalized vocabulary explicit while all catalog items
# retain one stable serialization format.
ProductSpec = dict[str, Any]
ModuleSpec = CatalogItem
ActorSpec = CatalogItem
UseCaseSpec = CatalogItem
WorkflowSpec = CatalogItem
ScreenSpec = CatalogItem
EndpointSpec = CatalogItem
EntitySpec = CatalogItem
BusinessRuleSpec = CatalogItem
ValidationSpec = CatalogItem
TraceabilityRelation = dict[str, Any]
NormalizationFinding = "Finding"
NormalizationReport = dict[str, Any]


@dataclass(frozen=True)
class Finding:
    code: str
    severity: str
    message: str
    provenance: Provenance | None = None


@dataclass
class Catalog:
    product: dict[str, Any]
    modules: list[CatalogItem] = field(default_factory=list)
    actors: list[CatalogItem] = field(default_factory=list)
    use_cases: list[CatalogItem] = field(default_factory=list)
    workflows: list[CatalogItem] = field(default_factory=list)
    screens: list[CatalogItem] = field(default_factory=list)
    endpoints: list[CatalogItem] = field(default_factory=list)
    entities: list[CatalogItem] = field(default_factory=list)
    business_rules: list[CatalogItem] = field(default_factory=list)
    validations: list[CatalogItem] = field(default_factory=list)
    traceability: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
