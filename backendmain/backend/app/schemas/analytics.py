from pydantic import BaseModel


class PopularDocument(BaseModel):
    filename: str
    access_count: int

    class Config:
        from_attributes = True


class AnalyticsSummary(BaseModel):
    total_documents: int
    total_sessions: int
    total_questions_asked: int
    top_documents: list[PopularDocument]
    recent_questions: list[str]


class UsagePoint(BaseModel):
    label: str
    value: int


class UsageSummary(BaseModel):
    labels: list[str]
    values: list[int]
    automation_rate: int