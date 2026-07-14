import { useEffect, useMemo, useRef, useState } from 'react';
import { resources } from './resources';

const soilMixFilters = [
  'All',
  'Tropical',
  'Aroid',
  'Anthurium',
  'Alocasia',
  'Moisture Loving',
  'Succulent',
  'Propagation',
  'Semi-Hydro',
];

function includesSearch(value, searchText) {
  return String(value || '').toLowerCase().includes(searchText);
}

function getRecipeSearchText(recipe) {
  return [
    recipe.name,
    recipe.description,
    recipe.category,
    recipe.medium,
    recipe.reservoir,
    recipe.instructions,
    ...(recipe.bestFor || []),
    ...(recipe.ingredients || []),
    ...(recipe.characteristics || []),
  ].filter(Boolean).join(' ');
}

function ResourceLanding({ onOpenResource }) {
  const [resourceSearch, setResourceSearch] = useState('');
  const normalizedSearch = resourceSearch.trim().toLowerCase();
  const visibleResources = resources.filter((resource) => (
    !normalizedSearch
    || includesSearch(resource.title, normalizedSearch)
    || includesSearch(resource.category, normalizedSearch)
    || includesSearch(resource.description, normalizedSearch)
  ));

  return (
    <section className="resources-view" aria-labelledby="resources-heading">
      <div className="resources-heading">
        <div>
          <p className="detail-eyebrow">Care library</p>
          <h2 id="resources-heading">Resources</h2>
          <p>Plant-care references stored natively inside Plant Tracker.</p>
        </div>
      </div>

      <div className="resources-tools">
        <div className="plant-search">
          <label htmlFor="resource-search">Search resources</label>
          <input
            id="resource-search"
            type="search"
            placeholder="Search title, category, or description..."
            value={resourceSearch}
            onChange={(event) => setResourceSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="resource-card-grid">
        {visibleResources.length ? visibleResources.map((resource) => (
          <button
            className="resource-card"
            type="button"
            key={resource.id}
            onClick={() => onOpenResource(resource.id)}
            aria-label={`Open ${resource.title}`}
          >
            <span className="resource-card-icon" aria-hidden="true">{resource.icon}</span>
            <span className="resource-card-content">
              <span className="wishlist-status">{resource.category}</span>
              <strong>{resource.title}</strong>
              <span>{resource.description}</span>
              <small>Updated {resource.lastUpdated}</small>
            </span>
            <span className="view-details">Open resource →</span>
          </button>
        )) : <p className="empty-message">No resources found.</p>}
      </div>
    </section>
  );
}

function RecipeDetailList({ title, items }) {
  if (!items?.length) return null;

  return (
    <div className="soil-recipe-group">
      <h4>{title}</h4>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

function SoilRecipeCard({ recipe, isExpanded, onToggle, cardRef }) {
  return (
    <article className="soil-recipe-card" ref={cardRef}>
      <button
        className="soil-recipe-toggle"
        type="button"
        aria-expanded={isExpanded}
        aria-controls={`${recipe.id}-content`}
        onClick={() => onToggle(recipe.id)}
      >
        <span>
          <span className="wishlist-status">{recipe.category}</span>
          <strong>{recipe.name}</strong>
          {recipe.description && <small>{recipe.description}</small>}
        </span>
        <span aria-hidden="true">{isExpanded ? '−' : '+'}</span>
      </button>

      {isExpanded && (
        <div className="soil-recipe-content" id={`${recipe.id}-content`}>
          <RecipeDetailList title="Best for" items={recipe.bestFor} />
          <RecipeDetailList title="Mix" items={recipe.ingredients} />
          <RecipeDetailList title="Characteristics" items={recipe.characteristics} />
          {recipe.medium && (
            <dl className="soil-mix-facts">
              <div><dt>Medium</dt><dd>{recipe.medium}</dd></div>
              {recipe.reservoir && <div><dt>Reservoir</dt><dd>{recipe.reservoir}</dd></div>}
              {recipe.instructions && <div><dt>Instructions</dt><dd>{recipe.instructions}</dd></div>}
            </dl>
          )}
        </div>
      )}
    </article>
  );
}

function ResourceNotesSection({ section }) {
  if (section.notes?.length) {
    return (
      <section className="resource-reference-section" aria-labelledby={`${section.id}-heading`}>
        <h3 id={`${section.id}-heading`}>{section.title}</h3>
        <dl className="resource-note-list">
          {section.notes.map((note) => (
            <div key={note.label}>
              <dt>{note.label}</dt>
              <dd>{note.text}</dd>
            </div>
          ))}
        </dl>
      </section>
    );
  }

  if (section.bullets?.length) {
    return (
      <section className="resource-reference-section" aria-labelledby={`${section.id}-heading`}>
        <h3 id={`${section.id}-heading`}>{section.title}</h3>
        <ul className="resource-bullet-list">
          {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
        </ul>
      </section>
    );
  }

  return null;
}

function SoilMixGuide({ resource, selectedRecipeId = '', onBack, returnLabel = '' }) {
  const [guideSearch, setGuideSearch] = useState('');
  const [plantSearch, setPlantSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const recipeRefs = useRef({});
  const [expandedRecipeIds, setExpandedRecipeIds] = useState(() => (
    window.matchMedia('(max-width: 700px)').matches ? [] : ['base-mix']
  ));
  const recipes = useMemo(() => (
    resource.sections.find((section) => section.id === 'soil-recipes')?.recipes || []
  ), [resource.sections]);
  const normalizedGuideSearch = guideSearch.trim().toLowerCase();
  const normalizedPlantSearch = plantSearch.trim().toLowerCase();
  const guideSections = resource.sections.filter((section) => section.id !== 'soil-recipes');

  useEffect(() => {
    if (!selectedRecipeId) return;

    setGuideSearch('');
    setPlantSearch('');
    setActiveFilter('All');
    setExpandedRecipeIds((currentIds) => (
      currentIds.includes(selectedRecipeId) ? currentIds : [...currentIds, selectedRecipeId]
    ));
  }, [selectedRecipeId]);

  const visibleRecipes = useMemo(() => recipes.filter((recipe) => {
    const matchesFilter = activeFilter === 'All' || recipe.category === activeFilter;
    const matchesGuideSearch = !normalizedGuideSearch || getRecipeSearchText(recipe).toLowerCase().includes(normalizedGuideSearch);
    const matchesPlantSearch = !normalizedPlantSearch
      || (recipe.bestFor || []).some((plantName) => plantName.toLowerCase().includes(normalizedPlantSearch));

    return matchesFilter && matchesGuideSearch && matchesPlantSearch;
  }), [activeFilter, normalizedGuideSearch, normalizedPlantSearch, recipes]);

  useEffect(() => {
    if (!selectedRecipeId) return;

    window.requestAnimationFrame(() => {
      recipeRefs.current[selectedRecipeId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [selectedRecipeId, visibleRecipes]);

  function toggleRecipe(recipeId) {
    setExpandedRecipeIds((currentIds) => (
      currentIds.includes(recipeId)
        ? currentIds.filter((currentId) => currentId !== recipeId)
        : [...currentIds, recipeId]
    ));
  }

  function expandAll() {
    setExpandedRecipeIds(visibleRecipes.map((recipe) => recipe.id));
  }

  function collapseAll() {
    setExpandedRecipeIds([]);
  }

  return (
    <article className="resource-detail plant-detail" aria-labelledby="resource-detail-heading">
      <div className="detail-actions">
        <button className="back-button" type="button" onClick={onBack}>
          {returnLabel || '← Back to Resources'}
        </button>
      </div>

      <div className="resource-detail-heading">
        <span className="resource-card-icon" aria-hidden="true">{resource.icon}</span>
        <div>
          <p className="detail-eyebrow">{resource.category} · {resource.version}</p>
          <h2 id="resource-detail-heading">{resource.title}</h2>
          <p>{resource.intro}</p>
          <small>Updated {resource.lastUpdated}</small>
        </div>
      </div>

      <section className="soil-guide-tools" aria-label="Soil mix search and filters">
        <div className="plant-search">
          <label htmlFor="soil-guide-search">Search guide</label>
          <input
            id="soil-guide-search"
            type="search"
            placeholder="Search mixes, plants, ingredients..."
            value={guideSearch}
            onChange={(event) => setGuideSearch(event.target.value)}
          />
        </div>
        <div className="plant-search">
          <label htmlFor="plant-mix-search">Find a mix for my plant</label>
          <input
            id="plant-mix-search"
            type="search"
            placeholder="Enter a plant name..."
            value={plantSearch}
            onChange={(event) => setPlantSearch(event.target.value)}
          />
        </div>
        <div className="soil-filter-list" role="group" aria-label="Filter soil mixes">
          {soilMixFilters.map((filter) => (
            <button
              type="button"
              key={filter}
              className={activeFilter === filter ? 'quick-view-active' : ''}
              aria-pressed={activeFilter === filter}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="soil-expand-actions">
          <button className="clear-filters-button" type="button" onClick={expandAll}>Expand All</button>
          <button className="clear-filters-button" type="button" onClick={collapseAll}>Collapse All</button>
        </div>
      </section>

      <section className="soil-recipe-list" aria-label="Soil mix recipes">
        {visibleRecipes.length ? visibleRecipes.map((recipe) => (
          <SoilRecipeCard
            key={recipe.id}
            recipe={recipe}
            isExpanded={expandedRecipeIds.includes(recipe.id)}
            onToggle={toggleRecipe}
            cardRef={(node) => {
              if (node) recipeRefs.current[recipe.id] = node;
            }}
          />
        )) : <p className="empty-message">No matching mixes found.</p>}
      </section>

      {guideSections.map((section) => <ResourceNotesSection key={section.id} section={section} />)}
    </article>
  );
}

export default function Resources({
  selectedResourceId,
  selectedSoilMixRecipeId,
  returnLabel,
  onOpenResource,
  onBackToResources,
  onBackToPlant,
}) {
  const selectedResource = resources.find((resource) => resource.id === selectedResourceId);

  if (selectedResource?.type === 'soil-mix-guide') {
    return (
      <SoilMixGuide
        resource={selectedResource}
        selectedRecipeId={selectedSoilMixRecipeId}
        returnLabel={returnLabel}
        onBack={returnLabel ? onBackToPlant : onBackToResources}
      />
    );
  }

  return <ResourceLanding onOpenResource={onOpenResource} />;
}
