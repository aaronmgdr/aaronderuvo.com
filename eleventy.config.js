export default function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("styles.css");
  eleventyConfig.ignores.add("README.md");

  eleventyConfig.addCollection('opeds', function(collectionApi) {
    return collectionApi.getFilteredByGlob('opeds/*.md').filter(item => !item.inputPath.endsWith('index.md'));
  });

  eleventyConfig.addCollection('investigate', function(collectionApi) {
    return collectionApi.getFilteredByGlob('investigate/*.md').filter(item => !item.inputPath.endsWith('index.md'));
  });
}
