-- 知识库文档表
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(256) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(64) NOT NULL DEFAULT 'general',
  tags JSONB DEFAULT '[]',
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS knowledge_documents_category_idx ON knowledge_documents(category);
CREATE INDEX IF NOT EXISTS knowledge_documents_search_vector_idx ON knowledge_documents USING GIN(search_vector);

-- 自动更新 search_vector 的触发器
CREATE OR REPLACE FUNCTION knowledge_documents_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple', NEW.title || ' ' || NEW.content);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS knowledge_documents_search_vector_trigger ON knowledge_documents;
CREATE TRIGGER knowledge_documents_search_vector_trigger
  BEFORE INSERT OR UPDATE ON knowledge_documents
  FOR EACH ROW
  EXECUTE FUNCTION knowledge_documents_search_vector_update();

-- 全文搜索函数
CREATE OR REPLACE FUNCTION search_knowledge(
  search_query TEXT,
  match_count INT DEFAULT 5,
  filter_category VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  id VARCHAR,
  title VARCHAR,
  content TEXT,
  category VARCHAR,
  tags JSONB,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kd.id,
    kd.title,
    kd.content,
    kd.category,
    kd.tags,
    ts_rank(kd.search_vector, plainto_tsquery('simple', search_query)) AS relevance
  FROM knowledge_documents kd
  WHERE
    kd.search_vector @@ plainto_tsquery('simple', search_query)
    AND (filter_category IS NULL OR kd.category = filter_category)
  ORDER BY relevance DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
