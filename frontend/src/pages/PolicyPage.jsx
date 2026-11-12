import PageHeader from '../components/PageHeader';
import { POLICY_CHAPTERS } from '../constants/policy';

export default function PolicyPage() {
  return (
    <>
      <PageHeader
        title="公司访客管理制度"
        description="访客登记、进入、离开与行为规范。系统流程依据本制度执行。"
      />

      <div className="policy-layout">
        <nav className="policy-toc" aria-label="制度目录">
          <span className="policy-toc__title">目录</span>
          <ol>
            {POLICY_CHAPTERS.map((chapter) => (
              <li key={chapter.id}>
                <a href={`#${chapter.id}`}>{chapter.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="policy-article">
          {POLICY_CHAPTERS.map((chapter) => (
            <section className="policy-card" id={chapter.id} key={chapter.id}>
              <h2>{chapter.title}</h2>
              {chapter.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {chapter.items ? (
                chapter.ordered ? (
                  <ol>
                    {chapter.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                ) : (
                  <ul>
                    {chapter.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )
              ) : null}
            </section>
          ))}

          <p className="source-note">
            来源：<code>assets/公司访客管理制度.png</code>（OCR 整理），完整原文见仓库
            <code>docs/公司访客管理制度.md</code>。本页内容为系统内嵌的制度要点，未增删条款。
          </p>
        </article>
      </div>
    </>
  );
}
