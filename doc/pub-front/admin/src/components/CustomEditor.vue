<script setup>
  import { ref } from 'vue'

  const editor = ref(null);

  function saveText() {
    const content = document.getElementById('editor').innerHTML;
    const blob = new Blob([content], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'my-text.html';
    a.click();
  }

  function insertNodeAtCursor(node) {
    const sel = window.getSelection();
    let range;
    if (sel && sel.rangeCount > 0) {
      range = sel.getRangeAt(0);
      if (!editor.value.contains(range.startContainer)) {
        range = null;
      }
    }

    if (!range) {
      editor.value.appendChild(node);
      return;
    }

    // 텍스트 노드 안이면 split
    const startContainer = range.startContainer;
    if (startContainer.nodeType === Node.TEXT_NODE) {
      const textNode = startContainer;
      const offset = range.startOffset;
      const afterText = textNode.splitText(offset);
      range.setStartAfter(textNode);
    }

    range.deleteContents();
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);

    sel.removeAllRanges();
    sel.addRange(range);
  }

  function insertImages(event) {
    const files = event.target.files;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = document.createElement('img');
        img.src = e.target.result;

        img.onload = function() {
          img.classList.add(img.naturalWidth > img.naturalHeight ? 'garo' : 'sero');

          insertNodeAtCursor(img);
        }

      };
      reader.readAsDataURL(file);
    });

    event.target.value = '';
  }

</script>

<template>
  <div class="toolbar">
    <!-- <button @click="saveText()">💾 저장</button> -->
    <label class="img-label" @mousedown.prevent>
      <input type="file" accept="image/*" multiple @change="insertImages($event)" />
      <strong>image +</strong>
    </label>
  </div>
  <div contenteditable="true" ref="editor" class="custom-editor"></div>
</template>
<style scoped lang="scss">

  .toolbar {
    background: #333;
    color: white;
    padding: 10px;
    text-align: right;

    label{
      vertical-align: top;
      cursor: pointer;
    }
  }

  .custom-editor {
    padding: 20px;
    height: 800px;
    background: white;
    border: 1px solid #ccc;
    overflow-y: auto;
    outline: 0;
  }

  .img-label{
    input{
      display: none;
    }
  }
</style>

<style lang="scss">
.custom-editor img{
  max-width: 100%;
  max-height: 100%;
  display: block;
  width: auto;
  height: auto;
}
.custom-editor img.garo{
  width: 720px;
}
.custom-editor img.sero{
  height: 720px;
}

</style>